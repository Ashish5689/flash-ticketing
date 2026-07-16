import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';

import { db, pool } from '../config/db.js';
import { redis } from '../config/redis.js';
import { movies } from '../db/schema/movies.js';
import { shows } from '../db/schema/shows.js';
import { screens, theaters } from '../db/schema/theaters.js';
import { users } from '../db/schema/users.js';
import {
  createShow,
  getShowSeatMap,
  listMovieShowtimes,
  publishShow,
} from '../modules/shows/show.service.js';

const suffix = randomUUID();
let userId: string | undefined;
let movieId: string | undefined;
let theaterId: string | undefined;
let showId: string | undefined;

async function verify() {
  const [user] = await db
    .insert(users)
    .values({
      email: `phase3-${suffix}@example.com`,
      name: 'Phase 3 Verifier',
      firebaseUid: `phase3-${suffix}`,
      provider: 'password',
      role: 'ORGANIZER',
    })
    .returning({ id: users.id });
  if (!user) throw new Error('Could not create verifier organizer');
  userId = user.id;

  const [movie] = await db
    .insert(movies)
    .values({
      title: `Phase 3 Verification ${suffix.slice(0, 8)}`,
      description: 'A temporary catalog record used to verify show publication and seat expansion.',
      posterUrl: '/posters/skybound.png',
      genres: ['Drama'],
      languages: ['English'],
      durationMin: 120,
      certificate: 'U/A',
      rating: 8,
      releaseDate: '2026-07-01',
      status: 'published',
    })
    .returning({ id: movies.id });
  if (!movie) throw new Error('Could not create verifier movie');
  movieId = movie.id;

  const [theater] = await db
    .insert(theaters)
    .values({
      organizerId: user.id,
      name: `Phase 3 Cinema ${suffix.slice(0, 8)}`,
      city: 'Phase 3 Test City',
      address: '100 Verification Road, Test District',
    })
    .returning({ id: theaters.id });
  if (!theater) throw new Error('Could not create verifier theater');
  theaterId = theater.id;

  const [screen] = await db
    .insert(screens)
    .values({
      theaterId: theater.id,
      name: 'Verifier Screen',
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

  const startsAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const created = await createShow(user.id, {
    movieId: movie.id,
    screenId: screen.id,
    startsAt: startsAt.toISOString(),
    pricing: [
      { tier: 'CLASSIC', priceCents: 20_000 },
      { tier: 'PRIME', priceCents: 30_000 },
    ],
  });
  showId = created.id;
  const published = await publishShow(created.id, user.id);
  if (published.status !== 'onsale' || published.seatCount !== 7) {
    throw new Error('Show publication did not atomically generate seven seats');
  }

  const date = startsAt.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const showtimes = await listMovieShowtimes(movie.id, { city: 'Phase 3 Test City', date });
  if (showtimes.theaters.length !== 1) throw new Error('Public showtime lookup failed');
  const seatMap = await getShowSeatMap(created.id);
  if (seatMap.layout.rows.length !== 2 || seatMap.layout.rows[0]?.seats.length !== 4) {
    throw new Error('Public seat map does not match the source layout');
  }
  process.stdout.write(
    'Phase 3 live verification passed: schedule → publish → showtimes → seats.\n',
  );
}

try {
  await verify();
} finally {
  if (showId) await db.delete(shows).where(eq(shows.id, showId));
  if (theaterId) await db.delete(theaters).where(eq(theaters.id, theaterId));
  if (movieId) await db.delete(movies).where(eq(movies.id, movieId));
  if (userId) await db.delete(users).where(eq(users.id, userId));
  await pool.end();
  if (redis.status !== 'wait' && redis.status !== 'end') redis.disconnect();
}
