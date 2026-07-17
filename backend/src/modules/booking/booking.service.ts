import { randomUUID } from 'node:crypto';

import { and, asc, desc, eq, inArray } from 'drizzle-orm';

import { db } from '../../config/db.js';
import { redis } from '../../config/redis.js';
import { orderItems, orders, payments } from '../../db/schema/bookings.js';
import { movies } from '../../db/schema/movies.js';
import { showPricing, showSeats, shows } from '../../db/schema/shows.js';
import { screens, theaters } from '../../db/schema/theaters.js';
import { AppError } from '../../shared/errors.js';
import { getPublicShow } from '../shows/show.service.js';
import type { HoldInput } from './booking.schemas.js';

export const holdTtlSeconds = 5 * 60;
const idempotencyTtlSeconds = 24 * 60 * 60;
const confirmationLockSeconds = 30;

export type HoldMetadata = {
  holdId: string;
  userId: string;
  showId: string;
  seats: string[];
  expiresAt: string;
};

type AtomicHoldResult = { acquired: true } | { acquired: false; takenSeat: string };

export type AtomicHoldStore = {
  acquire(input: HoldMetadata): Promise<AtomicHoldResult>;
  release(input: HoldMetadata): Promise<void>;
};

const acquireHoldScript = `
local acquired = {}
for index = 1, #KEYS - 1 do
  local created = redis.call('SET', KEYS[index], ARGV[1], 'NX', 'EX', ARGV[2])
  if not created then
    for _, key in ipairs(acquired) do
      if redis.call('GET', key) == ARGV[1] then redis.call('DEL', key) end
    end
    return {0, KEYS[index]}
  end
  table.insert(acquired, KEYS[index])
end
redis.call('SET', KEYS[#KEYS], ARGV[3], 'EX', ARGV[2])
return {1}
`;

const releaseHoldScript = `
for index = 1, #KEYS - 1 do
  if redis.call('GET', KEYS[index]) == ARGV[1] then redis.call('DEL', KEYS[index]) end
end
redis.call('DEL', KEYS[#KEYS])
return 1
`;

function seatKey(showId: string, seat: string) {
  return `hold:${showId}:${seat}`;
}

function holdKey(holdId: string) {
  return `booking-hold:${holdId}`;
}

function holdValue(metadata: Pick<HoldMetadata, 'holdId' | 'userId'>) {
  return `${metadata.holdId}:${metadata.userId}`;
}

export const redisHoldStore: AtomicHoldStore = {
  async acquire(metadata) {
    const keys = [
      ...metadata.seats.map((seat) => seatKey(metadata.showId, seat)),
      holdKey(metadata.holdId),
    ];
    const result = (await redis.eval(
      acquireHoldScript,
      keys.length,
      ...keys,
      holdValue(metadata),
      String(holdTtlSeconds),
      JSON.stringify(metadata),
    )) as [number, string?];
    if (Number(result[0]) === 1) return { acquired: true };
    return { acquired: false, takenSeat: String(result[1]).split(':').at(-1) ?? 'unknown' };
  },
  async release(metadata) {
    const keys = [
      ...metadata.seats.map((seat) => seatKey(metadata.showId, seat)),
      holdKey(metadata.holdId),
    ];
    await redis.eval(releaseHoldScript, keys.length, ...keys, holdValue(metadata));
  },
};

async function pricedSeats(showId: string, labels: string[]) {
  return db
    .select({
      id: showSeats.id,
      label: showSeats.seatLabel,
      tier: showSeats.tier,
      status: showSeats.status,
      priceCents: showPricing.priceCents,
    })
    .from(showSeats)
    .innerJoin(
      showPricing,
      and(eq(showPricing.showId, showSeats.showId), eq(showPricing.tier, showSeats.tier)),
    )
    .innerJoin(shows, eq(showSeats.showId, shows.id))
    .where(
      and(
        eq(showSeats.showId, showId),
        inArray(showSeats.seatLabel, labels),
        eq(shows.status, 'onsale'),
      ),
    )
    .orderBy(asc(showSeats.seatLabel));
}

export async function createSeatHold(
  userId: string,
  input: HoldInput,
  store: AtomicHoldStore = redisHoldStore,
) {
  const labels = [...input.seats].sort();
  const seats = await pricedSeats(input.showId, labels);
  if (seats.length !== labels.length) {
    throw new AppError(409, 'SEATS_UNAVAILABLE', 'One or more seats are unavailable for this show');
  }
  const sold = seats.filter((seat) => seat.status === 'sold').map((seat) => seat.label);
  if (sold.length > 0) {
    throw new AppError(409, 'SEATS_TAKEN', 'Some selected seats are already sold', {
      takenSeats: sold,
    });
  }
  const holdId = randomUUID();
  const expiresAt = new Date(Date.now() + holdTtlSeconds * 1000).toISOString();
  const metadata: HoldMetadata = { holdId, userId, showId: input.showId, seats: labels, expiresAt };
  const acquired = await store.acquire(metadata);
  if (!acquired.acquired) {
    throw new AppError(409, 'SEATS_TAKEN', 'Some selected seats are already held', {
      takenSeats: [acquired.takenSeat],
    });
  }
  return {
    holdId,
    showId: input.showId,
    seats: seats.map(({ label, tier, priceCents }) => ({ label, tier, priceCents })),
    amountCents: seats.reduce((total, seat) => total + seat.priceCents, 0),
    expiresAt,
  };
}

async function readHoldMetadata(holdId: string, userId: string) {
  const raw = await redis.get(holdKey(holdId));
  if (!raw) throw new AppError(410, 'HOLD_EXPIRED', 'This seat hold has expired');
  const metadata = JSON.parse(raw) as HoldMetadata;
  if (metadata.userId !== userId)
    throw new AppError(404, 'HOLD_NOT_FOUND', 'Seat hold was not found');
  const values = await redis.mget(metadata.seats.map((seat) => seatKey(metadata.showId, seat)));
  if (values.some((value) => value !== holdValue(metadata))) {
    throw new AppError(410, 'HOLD_EXPIRED', 'This seat hold has expired');
  }
  return metadata;
}

export async function getSeatHold(holdId: string, userId: string) {
  const metadata = await readHoldMetadata(holdId, userId);
  const [seats, show] = await Promise.all([
    pricedSeats(metadata.showId, metadata.seats),
    getPublicShow(metadata.showId),
  ]);
  if (seats.length !== metadata.seats.length) {
    throw new AppError(409, 'SEATS_UNAVAILABLE', 'Held seats are no longer available');
  }
  return {
    holdId,
    showId: metadata.showId,
    seats: seats.map(({ label, tier, priceCents }) => ({ label, tier, priceCents })),
    amountCents: seats.reduce((total, seat) => total + seat.priceCents, 0),
    expiresAt: metadata.expiresAt,
    show,
  };
}

export async function releaseSeatHold(holdId: string, userId: string) {
  const metadata = await readHoldMetadata(holdId, userId);
  await redisHoldStore.release(metadata);
}

async function orderDetails(orderId: string, userId: string) {
  const [result] = await db
    .select({
      order: orders,
      movie: {
        id: movies.id,
        title: movies.title,
        posterUrl: movies.posterUrl,
        certificate: movies.certificate,
      },
      show: { id: shows.id, startsAt: shows.startsAt },
      screen: { id: screens.id, name: screens.name },
      theater: {
        id: theaters.id,
        name: theaters.name,
        city: theaters.city,
        address: theaters.address,
      },
      payment: {
        provider: payments.provider,
        providerRef: payments.providerRef,
        status: payments.status,
      },
    })
    .from(orders)
    .innerJoin(shows, eq(orders.showId, shows.id))
    .innerJoin(movies, eq(shows.movieId, movies.id))
    .innerJoin(screens, eq(shows.screenId, screens.id))
    .innerJoin(theaters, eq(screens.theaterId, theaters.id))
    .innerJoin(payments, eq(payments.orderId, orders.id))
    .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
    .limit(1);
  if (!result) throw new AppError(404, 'BOOKING_NOT_FOUND', 'Booking was not found');
  const items = await db
    .select({
      id: orderItems.id,
      seatId: showSeats.id,
      label: showSeats.seatLabel,
      tier: showSeats.tier,
      priceCents: orderItems.priceCents,
    })
    .from(orderItems)
    .innerJoin(showSeats, eq(orderItems.showSeatId, showSeats.id))
    .where(eq(orderItems.orderId, orderId))
    .orderBy(asc(showSeats.seatLabel));
  return {
    ...result.order,
    movie: result.movie,
    show: result.show,
    screen: result.screen,
    theater: result.theater,
    payment: result.payment,
    seats: items,
    ticket: {
      code: result.order.ticketCode,
      qrPayload: `https://bookmyshow.local/tickets/${result.order.ticketCode}`,
    },
  };
}

async function existingIdempotentOrder(idempotencyKey: string, userId: string) {
  const [order] = await db
    .select({ id: orders.id, userId: orders.userId })
    .from(orders)
    .where(eq(orders.idempotencyKey, idempotencyKey))
    .limit(1);
  if (!order) return null;
  if (order.userId !== userId) {
    throw new AppError(409, 'IDEMPOTENCY_KEY_REUSED', 'Idempotency key was already used');
  }
  return orderDetails(order.id, userId);
}

async function releaseConfirmationLock(key: string, value: string) {
  await redis.eval(
    `if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end return 0`,
    1,
    key,
    value,
  );
}

export async function confirmBooking(
  userId: string,
  idempotencyKey: string,
  input: { holdId: string; payment: { provider: 'stripe' | 'test'; providerRef: string } },
) {
  const existing = await existingIdempotentOrder(idempotencyKey, userId);
  if (existing) return existing;

  const cacheKey = `idem:${idempotencyKey}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached) as Awaited<ReturnType<typeof orderDetails>>;

  const lockKey = `idem-lock:${idempotencyKey}`;
  const lockValue = randomUUID();
  const locked = await redis.set(lockKey, lockValue, 'EX', confirmationLockSeconds, 'NX');
  if (!locked) {
    throw new AppError(409, 'CONFIRMATION_IN_PROGRESS', 'This booking is already being confirmed');
  }

  try {
    const retryExisting = await existingIdempotentOrder(idempotencyKey, userId);
    if (retryExisting) return retryExisting;
    const metadata = await readHoldMetadata(input.holdId, userId);
    const priced = await pricedSeats(metadata.showId, metadata.seats);
    if (priced.length !== metadata.seats.length) {
      throw new AppError(409, 'SEATS_UNAVAILABLE', 'Held seats are no longer available');
    }

    const order = await db.transaction(async (tx) => {
      const lockedSeats = await tx
        .select()
        .from(showSeats)
        .where(
          and(eq(showSeats.showId, metadata.showId), inArray(showSeats.seatLabel, metadata.seats)),
        )
        .orderBy(asc(showSeats.id))
        .for('update');
      if (
        lockedSeats.length !== metadata.seats.length ||
        lockedSeats.some((seat) => seat.status !== 'available')
      ) {
        throw new AppError(409, 'SEATS_TAKEN', 'One or more held seats were already sold');
      }
      const priceByTier = new Map(priced.map((seat) => [seat.tier, seat.priceCents]));
      const amountCents = lockedSeats.reduce(
        (total, seat) => total + (priceByTier.get(seat.tier) ?? 0),
        0,
      );
      const [created] = await tx
        .insert(orders)
        .values({
          userId,
          showId: metadata.showId,
          amountCents,
          idempotencyKey,
          ticketCode: `FLT-${randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`,
        })
        .returning();
      if (!created) throw new Error('Failed to create booking');
      await tx.insert(orderItems).values(
        lockedSeats.map((seat) => ({
          orderId: created.id,
          showSeatId: seat.id,
          priceCents: priceByTier.get(seat.tier) ?? 0,
        })),
      );
      await tx.insert(payments).values({
        orderId: created.id,
        provider: input.payment.provider,
        providerRef: input.payment.providerRef,
        status: 'succeeded',
      });
      const sold = await tx
        .update(showSeats)
        .set({ status: 'sold' })
        .where(
          and(
            inArray(
              showSeats.id,
              lockedSeats.map((seat) => seat.id),
            ),
            eq(showSeats.status, 'available'),
          ),
        )
        .returning({ id: showSeats.id });
      if (sold.length !== lockedSeats.length) {
        throw new AppError(409, 'SEATS_TAKEN', 'One or more held seats were already sold');
      }
      return created;
    });

    const result = await orderDetails(order.id, userId);
    await Promise.allSettled([
      redis.set(cacheKey, JSON.stringify(result), 'EX', idempotencyTtlSeconds),
      redisHoldStore.release(metadata),
    ]);
    return result;
  } finally {
    await releaseConfirmationLock(lockKey, lockValue);
  }
}

export async function listBookings(userId: string) {
  const rows = await db
    .select({ id: orders.id })
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt));
  return Promise.all(rows.map((order) => orderDetails(order.id, userId)));
}

export function getBooking(orderId: string, userId: string) {
  return orderDetails(orderId, userId);
}
