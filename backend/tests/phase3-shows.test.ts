import { describe, expect, it } from 'vitest';

import { showInputSchema, showtimeQuerySchema } from '../src/modules/shows/show.schemas.js';
import { expandSeatLayout } from '../src/modules/shows/show.service.js';

describe('Phase 3 show schemas', () => {
  const show = {
    movieId: '01b66cd0-410d-4d47-9727-4c8fd6f0ee49',
    screenId: '643e11e5-bc8b-4b57-82bd-f2ac967375f9',
    startsAt: '2026-08-01T18:30:00+05:30',
    pricing: [
      { tier: 'CLASSIC' as const, priceCents: 20_000 },
      { tier: 'PRIME' as const, priceCents: 30_000 },
    ],
  };

  it('accepts one price per tier and rejects duplicate tiers', () => {
    expect(showInputSchema.parse(show)).toMatchObject(show);
    expect(
      showInputSchema.safeParse({ ...show, pricing: [show.pricing[0], show.pricing[0]] }).success,
    ).toBe(false);
  });

  it('validates city/date showtime filters', () => {
    expect(showtimeQuerySchema.parse({ city: 'Mumbai', date: '2026-08-01' })).toEqual({
      city: 'Mumbai',
      date: '2026-08-01',
    });
    expect(showtimeQuerySchema.safeParse({ city: 'M', date: '01/08/2026' }).success).toBe(false);
  });
});

describe('show seat expansion', () => {
  it('creates stable labels, row metadata, and tiers from a screen template', () => {
    const seats = expandSeatLayout({
      rows: [
        { label: 'a', seatCount: 3, tier: 'CLASSIC' },
        { label: 'B', seatCount: 2, tier: 'RECLINER' },
      ],
      aisleAfterColumns: [2],
    });
    expect(seats).toEqual([
      { seatLabel: 'A1', rowLabel: 'A', seatNumber: 1, tier: 'CLASSIC', status: 'available' },
      { seatLabel: 'A2', rowLabel: 'A', seatNumber: 2, tier: 'CLASSIC', status: 'available' },
      { seatLabel: 'A3', rowLabel: 'A', seatNumber: 3, tier: 'CLASSIC', status: 'available' },
      { seatLabel: 'B1', rowLabel: 'B', seatNumber: 1, tier: 'RECLINER', status: 'available' },
      { seatLabel: 'B2', rowLabel: 'B', seatNumber: 2, tier: 'RECLINER', status: 'available' },
    ]);
  });
});
