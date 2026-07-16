import { randomUUID } from 'node:crypto';

import { eq, inArray } from 'drizzle-orm';

import { db, pool } from '../config/db.js';
import { redis } from '../config/redis.js';
import { orders } from '../db/schema/bookings.js';
import { movies } from '../db/schema/movies.js';
import { shows } from '../db/schema/shows.js';
import { screens, theaters } from '../db/schema/theaters.js';
import { users } from '../db/schema/users.js';
import {
  listAdminUsers,
  organizerDashboard,
  platformDashboard,
  updateUserStatus,
} from '../modules/analytics/analytics.service.js';
import {
  confirmBooking,
  createSeatHold,
  releaseSeatHold,
} from '../modules/booking/booking.service.js';
import { movieFacets } from '../modules/movies/movie.service.js';
import { createShow, publishShow } from '../modules/shows/show.service.js';

const suffix = randomUUID();
const userIds: string[] = [];
let movieId: string | undefined;
let theaterId: string | undefined;
let showId: string | undefined;
let heldId: string | undefined;

async function createUser(role: 'ORGANIZER' | 'USER') {
  const [user] = await db
    .insert(users)
    .values({
      email: `phase5-${role.toLowerCase()}-${suffix}@example.com`,
      name: `Phase 5 ${role}`,
      firebaseUid: `phase5-${role.toLowerCase()}-${suffix}`,
      provider: 'password',
      role,
    })
    .returning();
  if (!user) throw new Error('Could not create Phase 5 verifier user');
  userIds.push(user.id);
  return user;
}

async function verify() {
  const [organizer, buyer] = await Promise.all([createUser('ORGANIZER'), createUser('USER')]);
  const [movie] = await db
    .insert(movies)
    .values({
      title: `Phase 5 Analytics ${suffix.slice(0, 8)}`,
      description: 'A temporary movie used to verify analytics, filters, and access management.',
      posterUrl: '/posters/skybound.png',
      genres: ['Analytics'],
      languages: ['Hindi'],
      durationMin: 118,
      certificate: 'U/A',
      rating: 8.2,
      releaseDate: '2026-07-01',
      status: 'published',
    })
    .returning({ id: movies.id });
  if (!movie) throw new Error('Could not create Phase 5 movie');
  movieId = movie.id;
  const city = `Phase 5 City ${suffix.slice(0, 6)}`;
  const [theater] = await db
    .insert(theaters)
    .values({
      organizerId: organizer.id,
      name: `Phase 5 Cinema ${suffix.slice(0, 6)}`,
      city,
      address: '500 Dashboard Road',
    })
    .returning({ id: theaters.id });
  if (!theater) throw new Error('Could not create Phase 5 theater');
  theaterId = theater.id;
  const [screen] = await db
    .insert(screens)
    .values({
      theaterId: theater.id,
      name: 'Analytics Screen',
      layout: { rows: [{ label: 'A', seatCount: 4, tier: 'CLASSIC' }], aisleAfterColumns: [2] },
    })
    .returning({ id: screens.id });
  if (!screen) throw new Error('Could not create Phase 5 screen');
  const show = await createShow(organizer.id, {
    movieId: movie.id,
    screenId: screen.id,
    startsAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    pricing: [{ tier: 'CLASSIC', priceCents: 25_000 }],
  });
  showId = show.id;
  await publishShow(show.id, organizer.id);

  const held = await createSeatHold(buyer.id, { showId: show.id, seats: ['A1'] });
  heldId = held.holdId;
  const sold = await createSeatHold(buyer.id, { showId: show.id, seats: ['A2'] });
  await confirmBooking(buyer.id, randomUUID(), {
    holdId: sold.holdId,
    payment: { provider: 'test', providerRef: `phase5_${randomUUID()}` },
  });

  const organizerStats = await organizerDashboard(organizer.id);
  const showStats = organizerStats.shows.find((item) => item.id === show.id);
  if (
    showStats?.sold !== 1 ||
    showStats.held !== 1 ||
    showStats.available !== 2 ||
    showStats.revenueCents !== 25_000
  ) {
    throw new Error(`Organizer analytics mismatch: ${JSON.stringify(showStats)}`);
  }
  const platform = await platformDashboard();
  if (platform.bookings < 1 || platform.revenueCents < 25_000) {
    throw new Error('Platform analytics did not include the verifier booking');
  }
  const facets = await movieFacets();
  if (!facets.cities.includes(city) || !facets.genres.includes('Analytics')) {
    throw new Error('Dynamic city/genre facets did not include live catalog data');
  }
  const found = await listAdminUsers({ q: buyer.email, role: 'USER', status: 'active' });
  if (!found.some((user) => user.id === buyer.id)) throw new Error('Admin user search failed');
  await updateUserStatus(buyer.id, 'suspended', organizer.id);
  if (!(await redis.get(`account:suspended:${buyer.id}`)))
    throw new Error('Suspension was not enforced in Redis');
  await updateUserStatus(buyer.id, 'active', organizer.id);
  if (await redis.get(`account:suspended:${buyer.id}`))
    throw new Error('Account restore did not clear enforcement');
  await releaseSeatHold(held.holdId, buyer.id);
  heldId = undefined;

  process.stdout.write(
    'Phase 5 live verification passed: organizer/admin analytics, live facets, user suspend/restore enforcement, and Stripe-ready payment ledger passed.\n',
  );
}

try {
  await verify();
} finally {
  if (heldId) {
    try {
      await releaseSeatHold(heldId, userIds[1]!);
    } catch {
      /* hold may already be gone */
    }
  }
  for (const userId of userIds) await redis.del(`account:suspended:${userId}`);
  if (userIds.length) await db.delete(orders).where(inArray(orders.userId, userIds));
  if (showId) await db.delete(shows).where(eq(shows.id, showId));
  if (theaterId) await db.delete(theaters).where(eq(theaters.id, theaterId));
  if (movieId) await db.delete(movies).where(eq(movies.id, movieId));
  if (userIds.length) await db.delete(users).where(inArray(users.id, userIds));
  await pool.end();
  if (redis.status !== 'wait' && redis.status !== 'end') redis.disconnect();
}
