import { and, asc, eq } from 'drizzle-orm';

import { db, pool } from '../config/db.js';
import { redis } from '../config/redis.js';
import { movies } from '../db/schema/movies.js';
import { shows } from '../db/schema/shows.js';
import { screens, theaters, type ScreenLayout } from '../db/schema/theaters.js';
import { users } from '../db/schema/users.js';
import { createShow, publishShow } from '../modules/shows/show.service.js';

const organizerEmail = 'showcase.organizer@flash-ticketing.local';
const theaterName = 'Silver City Mumbai';
const screenName = 'Screen 1';
const showTimes = ['10:00', '13:00', '16:00', '19:00', '22:00'];

const layout: ScreenLayout = {
  rows: [
    { label: 'A', seatCount: 12, tier: 'CLASSIC' },
    { label: 'B', seatCount: 12, tier: 'CLASSIC' },
    { label: 'C', seatCount: 12, tier: 'CLASSIC' },
    { label: 'D', seatCount: 12, tier: 'CLASSIC' },
    { label: 'E', seatCount: 12, tier: 'PRIME' },
    { label: 'F', seatCount: 12, tier: 'PRIME' },
    { label: 'G', seatCount: 8, tier: 'RECLINER' },
  ],
  aisleAfterColumns: [4, 8],
};

function indiaDateAfter(days: number) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(Date.now() + days * 24 * 60 * 60 * 1000));
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

async function ensureOrganizer() {
  const [existing] = await db.select().from(users).where(eq(users.email, organizerEmail)).limit(1);
  if (existing) {
    if (existing.role !== 'ORGANIZER') {
      const [updated] = await db
        .update(users)
        .set({ role: 'ORGANIZER' })
        .where(eq(users.id, existing.id))
        .returning();
      if (!updated) throw new Error('Could not update showcase organizer');
      return updated;
    }
    return existing;
  }

  const [created] = await db
    .insert(users)
    .values({
      email: organizerEmail,
      name: 'Flash Ticketing Showcase',
      firebaseUid: 'flash-ticketing-showcase-organizer',
      provider: 'password',
      role: 'ORGANIZER',
    })
    .returning();
  if (!created) throw new Error('Could not create showcase organizer');
  return created;
}

async function ensureTheater(organizerId: string) {
  const [existing] = await db
    .select()
    .from(theaters)
    .where(and(eq(theaters.organizerId, organizerId), eq(theaters.name, theaterName)))
    .limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(theaters)
    .values({
      organizerId,
      name: theaterName,
      city: 'Mumbai',
      address: 'Phoenix Marketcity, Kurla West, Mumbai',
    })
    .returning();
  if (!created) throw new Error('Could not create showcase theater');
  return created;
}

async function ensureScreen(theaterId: string) {
  const [existing] = await db
    .select()
    .from(screens)
    .where(and(eq(screens.theaterId, theaterId), eq(screens.name, screenName)))
    .limit(1);
  if (existing) {
    const [updated] = await db
      .update(screens)
      .set({ layout, updatedAt: new Date() })
      .where(eq(screens.id, existing.id))
      .returning();
    if (!updated) throw new Error('Could not update showcase screen');
    return updated;
  }

  const [created] = await db
    .insert(screens)
    .values({ theaterId, name: screenName, layout })
    .returning();
  if (!created) throw new Error('Could not create showcase screen');
  return created;
}

async function seedShowcase() {
  const organizer = await ensureOrganizer();
  const theater = await ensureTheater(organizer.id);
  const screen = await ensureScreen(theater.id);
  const catalog = await db
    .select({ id: movies.id, title: movies.title })
    .from(movies)
    .where(eq(movies.status, 'published'))
    .orderBy(asc(movies.title));

  let createdCount = 0;
  for (let dayOffset = 1; dayOffset <= 5; dayOffset += 1) {
    const date = indiaDateAfter(dayOffset);
    for (const [index, movie] of catalog.entries()) {
      const time = showTimes[index % showTimes.length];
      const startsAt = new Date(`${date}T${time}:00+05:30`);
      const [existing] = await db
        .select({ id: shows.id })
        .from(shows)
        .where(and(eq(shows.screenId, screen.id), eq(shows.startsAt, startsAt)))
        .limit(1);
      if (existing) continue;

      const show = await createShow(organizer.id, {
        movieId: movie.id,
        screenId: screen.id,
        startsAt: startsAt.toISOString(),
        pricing: [
          { tier: 'CLASSIC', priceCents: 18_000 },
          { tier: 'PRIME', priceCents: 25_000 },
          { tier: 'RECLINER', priceCents: 40_000 },
        ],
      });
      await publishShow(show.id, organizer.id);
      createdCount += 1;
    }
  }

  process.stdout.write(
    `Showcase ready: ${catalog.length} movies, ${createdCount} new shows, ${theater.name}.\n`,
  );
}

try {
  await seedShowcase();
} finally {
  await pool.end();
  if (redis.status !== 'wait' && redis.status !== 'end') redis.disconnect();
}
