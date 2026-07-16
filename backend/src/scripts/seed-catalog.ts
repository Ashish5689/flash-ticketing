import { eq } from 'drizzle-orm';

import { db, pool } from '../config/db.js';
import { env } from '../config/env.js';
import { redis } from '../config/redis.js';
import { movies, type NewMovie } from '../db/schema/movies.js';

const mediaUrl = (fileName: string) => {
  const baseUrl = env.MEDIA_PUBLIC_BASE_URL?.replace(/\/$/, '');
  return baseUrl ? `${baseUrl}/movies/showcase/${fileName}` : `/posters/${fileName}`;
};

const catalog: NewMovie[] = [
  {
    title: 'Sitaare Zameen Par',
    description:
      'An uplifting coach and an unforgettable amateur basketball team discover that winning begins with belonging.',
    posterUrl: mediaUrl('sitaare-zameen-par.png'),
    genres: ['Comedy', 'Drama', 'Family'],
    languages: ['Hindi'],
    durationMin: 155,
    certificate: 'U/A',
    rating: 8.6,
    releaseDate: '2026-06-20',
    status: 'published',
  },
  {
    title: 'Kuberaa',
    description:
      'Three men from different worlds collide in a rain-soaked city where wealth, justice, and survival carry a price.',
    posterUrl: mediaUrl('kuberaa.png'),
    genres: ['Crime', 'Drama', 'Thriller'],
    languages: ['Telugu', 'Hindi', 'Tamil'],
    durationMin: 176,
    certificate: 'U/A',
    rating: 8.3,
    releaseDate: '2026-06-27',
    status: 'published',
  },
  {
    title: 'Skybound',
    description:
      'An island explorer and a mysterious winged companion cross a forgotten archipelago to protect their shared home.',
    posterUrl: mediaUrl('skybound.png'),
    genres: ['Adventure', 'Family', 'Fantasy'],
    languages: ['English', 'Hindi', 'Tamil'],
    durationMin: 125,
    certificate: 'U',
    rating: 8.4,
    releaseDate: '2026-07-04',
    status: 'published',
  },
  {
    title: 'Materialists',
    description:
      'A successful matchmaker must choose between a flawless future and the complicated connection she never forgot.',
    posterUrl: mediaUrl('materialists.png'),
    genres: ['Comedy', 'Drama', 'Romance'],
    languages: ['English'],
    durationMin: 116,
    certificate: 'A',
    rating: 7.8,
    releaseDate: '2026-09-12',
    status: 'published',
  },
];

async function seedCatalog() {
  for (const input of catalog) {
    const [existing] = await db
      .select({ id: movies.id })
      .from(movies)
      .where(eq(movies.title, input.title))
      .limit(1);
    if (existing) {
      await db
        .update(movies)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(movies.id, existing.id));
    } else {
      await db.insert(movies).values(input);
    }
  }
  process.stdout.write(`Seeded ${catalog.length} catalog movies.\n`);
}

try {
  await seedCatalog();
} finally {
  await pool.end();
  if (redis.status !== 'wait' && redis.status !== 'end') redis.disconnect();
}
