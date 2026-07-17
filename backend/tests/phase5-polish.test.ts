import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';

import { redis } from '../src/config/redis.js';
import { createApp } from '../src/app.js';
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
import { showDateQuerySchema } from '../src/modules/shows/show.schemas.js';
import {
  addIndiaDays,
  buildIndiaDateCounts,
  inclusiveIndiaDateRange,
} from '../src/shared/india-date.js';

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
    expect(movieListQuerySchema.parse({ contentType: 'event' }).contentType).toBe('event');
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

  it('validates inclusive catalog date ranges and show-date windows', () => {
    expect(
      movieListQuerySchema.parse({ dateFrom: '2026-07-16', dateTo: '2026-08-15' }),
    ).toMatchObject({ dateFrom: '2026-07-16', dateTo: '2026-08-15' });
    expect(
      movieListQuerySchema.safeParse({ dateFrom: '2026-07-16', dateTo: '2026-08-16' }).success,
    ).toBe(false);
    expect(movieListQuerySchema.safeParse({ dateFrom: '2026-07-16' }).success).toBe(false);
    expect(showDateQuerySchema.parse({ city: 'Mumbai', days: '14' }).days).toBe(14);
    expect(showDateQuerySchema.safeParse({ city: 'Mumbai', days: '15' }).success).toBe(false);
  });

  it('creates India-local inclusive query boundaries', () => {
    expect(addIndiaDays('2026-12-31', 1)).toBe('2027-01-01');
    const range = inclusiveIndiaDateRange('2026-07-16', '2026-07-17');
    expect(range.start.toISOString()).toBe('2026-07-15T18:30:00.000Z');
    expect(range.end.toISOString()).toBe('2026-07-17T18:30:00.000Z');
  });

  it('counts show dates using India-local day boundaries', () => {
    expect(
      buildIndiaDateCounts(
        [new Date('2026-07-16T18:29:59.000Z'), new Date('2026-07-16T18:30:00.000Z')],
        '2026-07-16',
        2,
      ),
    ).toEqual([
      { date: '2026-07-16', showCount: 1 },
      { date: '2026-07-17', showCount: 1 },
    ]);
  });
});

describe('viewer discovery API validation', () => {
  it('rejects invalid ranges and show-date windows before querying data', async () => {
    await request(createApp()).get('/movies?dateFrom=2026-07-16&dateTo=2026-08-16').expect(400);
    await request(createApp())
      .get('/movies/00000000-0000-4000-8000-000000000001/show-dates?city=Mumbai&days=15')
      .expect(400);
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
