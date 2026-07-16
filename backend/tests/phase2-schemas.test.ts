import { describe, expect, it } from 'vitest';

import { movieInputSchema } from '../src/modules/movies/movie.schemas.js';
import { organizerApplicationSchema } from '../src/modules/organizer/organizer.schemas.js';
import { screenInputSchema } from '../src/modules/theaters/theater.schemas.js';

describe('Phase 2 request schemas', () => {
  it('accepts a complete movie and rejects out-of-range ratings', () => {
    const input = {
      title: 'Schema Film',
      description: 'A sufficiently detailed description for a catalog movie.',
      posterUrl: '/posters/skybound.png',
      genres: ['Drama'],
      languages: ['English'],
      durationMin: 120,
      certificate: 'U/A',
      rating: 8.2,
      releaseDate: '2026-07-01',
      status: 'published' as const,
    };
    expect(movieInputSchema.parse(input)).toMatchObject(input);
    expect(movieInputSchema.safeParse({ ...input, rating: 10.1 }).success).toBe(false);
  });

  it('accepts event catalog entries through the shared ticketing model', () => {
    const event = movieInputSchema.parse({
      contentType: 'event',
      title: 'Live Showcase',
      description: 'A live stage performance configured through the shared booking catalog.',
      posterUrl: '/posters/skybound.png',
      genres: ['Theater'],
      languages: ['English'],
      durationMin: 120,
      certificate: 'U',
      rating: 8.5,
      releaseDate: '2026-07-18',
      status: 'published',
    });
    expect(event.contentType).toBe('event');
  });

  it('rejects duplicate row labels and accepts a tiered layout', () => {
    const valid = {
      name: 'Screen 1',
      layout: {
        rows: [
          { label: 'A', seatCount: 10, tier: 'CLASSIC' as const },
          { label: 'B', seatCount: 8, tier: 'PRIME' as const },
        ],
        aisleAfterColumns: [5],
      },
    };
    expect(screenInputSchema.parse(valid)).toMatchObject(valid);
    expect(
      screenInputSchema.safeParse({
        ...valid,
        layout: { ...valid.layout, rows: [valid.layout.rows[0], valid.layout.rows[0]] },
      }).success,
    ).toBe(false);
  });

  it('limits organizer application document URLs', () => {
    expect(
      organizerApplicationSchema.safeParse({
        businessName: 'Silver Screen',
        phone: '+91 98765 43210',
        documents: ['not-a-url'],
      }).success,
    ).toBe(false);
  });
});
