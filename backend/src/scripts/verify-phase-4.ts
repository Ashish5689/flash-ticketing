import { randomUUID } from 'node:crypto';

import { eq, inArray } from 'drizzle-orm';

import { db, pool } from '../config/db.js';
import { redis } from '../config/redis.js';
import { orders } from '../db/schema/bookings.js';
import { movies } from '../db/schema/movies.js';
import { shows } from '../db/schema/shows.js';
import { screens, theaters } from '../db/schema/theaters.js';
import { users } from '../db/schema/users.js';
import { signAccessToken } from '../modules/auth/token.service.js';
import { confirmBooking } from '../modules/booking/booking.service.js';
import { createShow, getShowSeatMap, publishShow } from '../modules/shows/show.service.js';

const apiUrl = process.env.PHASE_4_VERIFY_API_URL ?? 'http://localhost:4000';
const suffix = randomUUID();
const userIds: string[] = [];
const holdIds: string[] = [];
let movieId: string | undefined;
let theaterId: string | undefined;
let showId: string | undefined;

async function responseBody(response: Response) {
  return response.json().catch(() => ({})) as Promise<Record<string, unknown>>;
}

async function request<T>(path: string, token: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('authorization', `Bearer ${token}`);
  if (init.body) headers.set('content-type', 'application/json');
  const response = await fetch(`${apiUrl}${path}`, { ...init, headers });
  const body = await responseBody(response);
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${JSON.stringify(body)}`);
  return body as T;
}

async function createVerifierUser(name: string) {
  const [user] = await db
    .insert(users)
    .values({
      email: `phase4-${name.toLowerCase()}-${suffix}@example.com`,
      name: `Phase 4 ${name}`,
      firebaseUid: `phase4-${name.toLowerCase()}-${suffix}`,
      provider: 'password',
      role: name === 'Organizer' ? 'ORGANIZER' : 'USER',
    })
    .returning();
  if (!user) throw new Error(`Could not create ${name}`);
  userIds.push(user.id);
  return user;
}

async function hold(token: string, seats: string[]) {
  return request<{
    hold: { holdId: string; showId: string; seats: Array<{ label: string }>; expiresAt: string };
  }>('/bookings/hold', token, {
    method: 'POST',
    body: JSON.stringify({ showId, seats }),
  });
}

async function verify() {
  const [organizer, buyer, rival] = await Promise.all([
    createVerifierUser('Organizer'),
    createVerifierUser('Buyer'),
    createVerifierUser('Rival'),
  ]);
  const [buyerToken, rivalToken] = await Promise.all([
    signAccessToken(buyer),
    signAccessToken(rival),
  ]);

  const [movie] = await db
    .insert(movies)
    .values({
      title: `Phase 4 Verification ${suffix.slice(0, 8)}`,
      description: 'A temporary movie used to verify atomic holds and durable ticket confirmation.',
      posterUrl: '/posters/skybound.png',
      genres: ['Thriller'],
      languages: ['Hindi'],
      durationMin: 125,
      certificate: 'U/A',
      rating: 8.4,
      releaseDate: '2026-07-01',
      status: 'published',
    })
    .returning({ id: movies.id });
  if (!movie) throw new Error('Could not create verifier movie');
  movieId = movie.id;

  const [theater] = await db
    .insert(theaters)
    .values({
      organizerId: organizer.id,
      name: `Phase 4 Cinema ${suffix.slice(0, 8)}`,
      city: 'Mumbai',
      address: '400 Booking Verification Road, Mumbai',
    })
    .returning({ id: theaters.id });
  if (!theater) throw new Error('Could not create verifier theater');
  theaterId = theater.id;

  const [screen] = await db
    .insert(screens)
    .values({
      theaterId: theater.id,
      name: 'Booking Screen',
      layout: {
        rows: [
          { label: 'A', seatCount: 4, tier: 'CLASSIC' },
          { label: 'B', seatCount: 3, tier: 'PRIME' },
        ],
        aisleAfterColumns: [2],
      },
    })
    .returning({ id: screens.id });
  if (!screen) throw new Error('Could not create verifier screen');

  const created = await createShow(organizer.id, {
    movieId: movie.id,
    screenId: screen.id,
    startsAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    pricing: [
      { tier: 'CLASSIC', priceCents: 20_000 },
      { tier: 'PRIME', priceCents: 30_000 },
    ],
  });
  showId = created.id;
  await publishShow(created.id, organizer.id);

  const contenders = await Promise.all(
    Array.from({ length: 12 }, async (_, index) => {
      const token = index % 2 === 0 ? buyerToken : rivalToken;
      const response = await fetch(`${apiUrl}/bookings/hold`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ showId, seats: ['A1'] }),
      });
      const body = await responseBody(response);
      return {
        status: response.status,
        token,
        userId: index % 2 === 0 ? buyer.id : rival.id,
        body,
      };
    }),
  );
  const winners = contenders.filter((result) => result.status === 201);
  if (winners.length !== 1 || contenders.filter((result) => result.status === 409).length !== 11) {
    throw new Error('Parallel API holds did not produce exactly one winner');
  }
  const winner = winners[0];
  const winningHold = (winner?.body.hold as { holdId: string } | undefined)?.holdId;
  if (!winner || !winningHold) throw new Error('Winning hold response was incomplete');
  holdIds.push(winningHold);

  const idempotencyKey = randomUUID();
  const payment = { provider: 'test' as const, providerRef: `phase4_${randomUUID()}` };
  const confirmed = await confirmBooking(winner.userId, idempotencyKey, {
    holdId: winningHold,
    payment,
  });
  const replay = await confirmBooking(winner.userId, idempotencyKey, {
    holdId: winningHold,
    payment,
  });
  if (confirmed.id !== replay.id || !confirmed.ticket.code.startsWith('BMS-')) {
    throw new Error('Idempotent confirmation did not return the same QR ticket');
  }

  const seatMap = await getShowSeatMap(created.id);
  const soldSeat = seatMap.layout.rows
    .flatMap((row) => row.seats)
    .find((seat) => seat.label === 'A1');
  if (soldSeat?.status !== 'sold') throw new Error('Confirmed seat was not durably sold');

  const history = await request<{ bookings: Array<{ id: string }> }>('/bookings', winner.token);
  if (!history.bookings.some((booking) => booking.id === confirmed.id)) {
    throw new Error('Confirmed ticket was absent from booking history');
  }
  await request(`/bookings/${confirmed.id}`, winner.token);

  const released = await hold(buyerToken, ['A2']);
  holdIds.push(released.hold.holdId);
  await request(`/bookings/hold/${released.hold.holdId}`, buyerToken, { method: 'DELETE' });
  const reacquired = await hold(rivalToken, ['A2']);
  holdIds.push(reacquired.hold.holdId);
  await request(`/bookings/hold/${reacquired.hold.holdId}`, rivalToken, { method: 'DELETE' });

  const expiringHoldId = randomUUID();
  holdIds.push(expiringHoldId);
  const expiringValue = `${expiringHoldId}:${buyer.id}`;
  const expiresAt = new Date(Date.now() + 1000).toISOString();
  await redis
    .multi()
    .set(`hold:${created.id}:B1`, expiringValue, 'EX', 1)
    .set(
      `booking-hold:${expiringHoldId}`,
      JSON.stringify({
        holdId: expiringHoldId,
        userId: buyer.id,
        showId: created.id,
        seats: ['B1'],
        expiresAt,
      }),
      'EX',
      1,
    )
    .exec();
  await new Promise((resolve) => setTimeout(resolve, 1100));
  const expired = await fetch(`${apiUrl}/bookings/hold/${expiringHoldId}`, {
    headers: { authorization: `Bearer ${buyerToken}` },
  });
  if (expired.status !== 410) throw new Error(`Expired hold returned HTTP ${expired.status}`);

  process.stdout.write(
    'Phase 4 live verification passed: 12-way hold race → 1 winner; idempotent confirm → sold seat → QR ticket/history; release and TTL expiry passed.\n',
  );
}

try {
  await verify();
} finally {
  if (holdIds.length > 0 && showId) {
    await redis.del(
      ...holdIds.map((holdId) => `booking-hold:${holdId}`),
      ...['A1', 'A2', 'B1'].map((seat) => `hold:${showId}:${seat}`),
    );
  }
  if (userIds.length > 0) await db.delete(orders).where(inArray(orders.userId, userIds));
  if (showId) await db.delete(shows).where(eq(shows.id, showId));
  if (theaterId) await db.delete(theaters).where(eq(theaters.id, theaterId));
  if (movieId) await db.delete(movies).where(eq(movies.id, movieId));
  if (userIds.length > 0) await db.delete(users).where(inArray(users.id, userIds));
  await pool.end();
  if (redis.status !== 'wait' && redis.status !== 'end') redis.disconnect();
}
