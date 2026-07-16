import { randomUUID } from 'node:crypto';

import { afterAll, describe, expect, it } from 'vitest';

import { redis } from '../src/config/redis.js';
import { consumeRateLimit, rateLimitKey } from '../src/middleware/rate-limit.js';
import {
  adminUserQuerySchema,
  adminUserUpdateSchema,
} from '../src/modules/analytics/analytics.schemas.js';
import {
  checkoutSessionSchema,
  confirmBookingSchema,
} from '../src/modules/booking/booking.schemas.js';
import { movieListQuerySchema } from '../src/modules/movies/movie.schemas.js';

describe('Phase 5 API schemas', () => {
  it('validates admin filters and suspension updates', () => {
    expect(
      adminUserQuerySchema.parse({ q: 'ashish', role: 'ORGANIZER', status: 'active' }),
    ).toEqual({
      q: 'ashish',
      role: 'ORGANIZER',
      status: 'active',
    });
    expect(adminUserUpdateSchema.safeParse({ status: 'deleted' }).success).toBe(false);
  });

  it('accepts city catalog filters and Stripe Checkout identifiers', () => {
    expect(movieListQuerySchema.parse({ city: 'Mumbai' }).city).toBe('Mumbai');
    expect(
      checkoutSessionSchema.parse({
        holdId: '643e11e5-bc8b-4b57-82bd-f2ac967375f9',
        idempotencyKey: '01b66cd0-410d-4d47-9727-4c8fd6f0ee49',
      }).holdId,
    ).toBe('643e11e5-bc8b-4b57-82bd-f2ac967375f9');
    expect(confirmBookingSchema.parse({ checkoutSessionId: 'cs_test_123' }).checkoutSessionId).toBe(
      'cs_test_123',
    );
  });
});

describe.skipIf(!process.env.REDIS_URL)('Redis fixed-window rate limiting', () => {
  const options = {
    namespace: `phase5-${randomUUID()}`,
    limit: 2,
    windowSeconds: 30,
  };
  const identity = 'test-client';

  afterAll(async () => {
    await redis.del(rateLimitKey(options, identity));
    if (redis.status !== 'wait' && redis.status !== 'end') redis.disconnect();
  });

  it('allows the configured burst and rejects the next request', async () => {
    const [first, second, third] = await Promise.all([
      consumeRateLimit(options, identity),
      consumeRateLimit(options, identity),
      consumeRateLimit(options, identity),
    ]);
    expect([first, second, third].filter((result) => result.allowed)).toHaveLength(2);
    expect([first, second, third].filter((result) => !result.allowed)).toHaveLength(1);
    expect(third.retryAfterSeconds).toBeGreaterThan(0);
  });
});
