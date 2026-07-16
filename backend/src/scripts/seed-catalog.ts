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
    contentType: 'movie',
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
    contentType: 'movie',
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
    contentType: 'movie',
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
    contentType: 'movie',
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
  {
    contentType: 'movie',
    title: 'Monsoon Protocol',
    description:
      'A cybersecurity analyst races through a storm-struck Mumbai to stop a cascading attack on the city transit grid.',
    posterUrl: mediaUrl('monsoon-protocol-poster.webp'),
    bannerUrl: mediaUrl('monsoon-protocol-banner.webp'),
    genres: ['Action', 'Science Fiction', 'Thriller'],
    languages: ['Hindi', 'English'],
    durationMin: 138,
    certificate: 'U/A',
    rating: 8.2,
    releaseDate: '2026-07-11',
    status: 'published',
  },
  {
    contentType: 'movie',
    title: 'The Last Lighthouse',
    description:
      'A retired lighthouse keeper and his estranged granddaughter face one final storm and uncover a forgotten family promise.',
    posterUrl: mediaUrl('the-last-lighthouse-poster.webp'),
    bannerUrl: mediaUrl('the-last-lighthouse-banner.webp'),
    genres: ['Adventure', 'Drama'],
    languages: ['English', 'Hindi'],
    durationMin: 127,
    certificate: 'U',
    rating: 8.5,
    releaseDate: '2026-07-05',
    status: 'published',
  },
  {
    contentType: 'movie',
    title: 'Quantum Garden',
    description:
      'Two siblings discover a botanical conservatory where every glowing flower opens a window into a possible future.',
    posterUrl: mediaUrl('quantum-garden-poster.webp'),
    bannerUrl: mediaUrl('quantum-garden-banner.webp'),
    genres: ['Family', 'Fantasy', 'Science Fiction'],
    languages: ['English', 'Hindi', 'Tamil'],
    durationMin: 119,
    certificate: 'U',
    rating: 8.7,
    releaseDate: '2026-07-09',
    status: 'published',
  },
  {
    contentType: 'event',
    title: 'Neon Nights Live',
    description:
      'An immersive electronic music experience with a futuristic stage, synchronized light design, and high-energy live sets.',
    posterUrl: mediaUrl('neon-nights-live-poster.webp'),
    bannerUrl: mediaUrl('neon-nights-live-banner.webp'),
    genres: ['Concert', 'Electronic', 'Music'],
    languages: ['English', 'Hindi'],
    durationMin: 180,
    certificate: '16+',
    rating: 9.1,
    releaseDate: '2026-07-18',
    status: 'published',
  },
  {
    contentType: 'event',
    title: 'Laugh Track Mumbai',
    description:
      'A fast-paced evening of original stand-up comedy, sharp city observations, and audience-powered improvisation.',
    posterUrl: mediaUrl('laugh-track-mumbai-poster.webp'),
    bannerUrl: mediaUrl('laugh-track-mumbai-banner.webp'),
    genres: ['Comedy', 'Stand-up'],
    languages: ['Hindi', 'English'],
    durationMin: 105,
    certificate: '18+',
    rating: 8.8,
    releaseDate: '2026-07-17',
    status: 'published',
  },
  {
    contentType: 'event',
    title: 'Rhythm of India',
    description:
      'A contemporary stage production celebrating Indian classical and folk movement through an ensemble of dancers and live percussion.',
    posterUrl: mediaUrl('rhythm-of-india-poster.webp'),
    bannerUrl: mediaUrl('rhythm-of-india-banner.webp'),
    genres: ['Dance', 'Cultural', 'Theater'],
    languages: ['Hindi'],
    durationMin: 140,
    certificate: 'U',
    rating: 9.0,
    releaseDate: '2026-07-19',
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
