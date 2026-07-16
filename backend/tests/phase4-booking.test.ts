import { randomUUID } from 'node:crypto';

import { afterAll, describe, expect, it } from 'vitest';

import { redis } from '../src/config/redis.js';
import { confirmBookingSchema, holdInputSchema } from '../src/modules/booking/booking.schemas.js';
import {
  holdTtlSeconds,
  redisHoldStore,
  type HoldMetadata,
} from '../src/modules/booking/booking.service.js';

describe('Phase 4 booking schemas', () => {
  it('normalizes seat labels and rejects duplicates', () => {
    expect(
      holdInputSchema.parse({
        showId: '01b66cd0-410d-4d47-9727-4c8fd6f0ee49',
        seats: [' a1 ', 'B2'],
      }).seats,
    ).toEqual(['A1', 'B2']);
    expect(
      holdInputSchema.safeParse({
        showId: '01b66cd0-410d-4d47-9727-4c8fd6f0ee49',
        seats: ['A1', 'A1'],
      }).success,
    ).toBe(false);
  });

  it('accepts Stripe Checkout session identifiers', () => {
    expect(
      confirmBookingSchema.parse({
        checkoutSessionId: 'cs_test_example',
      }).checkoutSessionId,
    ).toBe('cs_test_example');
    expect(
      confirmBookingSchema.safeParse({
        checkoutSessionId: 'mock_payment',
      }).success,
    ).toBe(false);
  });
});

const liveRedisConfigured = Boolean(process.env.REDIS_URL);

describe.skipIf(!liveRedisConfigured)('atomic Redis seat holds', () => {
  const showId = randomUUID();
  const seat = 'A1';
  const contenders = Array.from(
    { length: 20 },
    () =>
      ({
        holdId: randomUUID(),
        userId: randomUUID(),
        showId,
        seats: [seat],
        expiresAt: new Date(Date.now() + holdTtlSeconds * 1000).toISOString(),
      }) satisfies HoldMetadata,
  );

  afterAll(async () => {
    await redis.del(
      `hold:${showId}:${seat}`,
      ...contenders.map((contender) => `booking-hold:${contender.holdId}`),
    );
    if (redis.status !== 'wait' && redis.status !== 'end') redis.disconnect();
  });

  it('allows exactly one of 20 parallel contenders to hold one seat', async () => {
    const results = await Promise.all(
      contenders.map((contender) => redisHoldStore.acquire(contender)),
    );
    const winners = results.filter((result) => result.acquired);
    expect(winners).toHaveLength(1);
    expect(results.filter((result) => !result.acquired)).toHaveLength(19);
  });
});
