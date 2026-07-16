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
const movieShowTimes = ['10:00', '13:00', '16:00', '19:00'];
const eventShowTimes = ['11:00', '16:00', '21:00'];

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

const eventLayout: ScreenLayout = {
  rows: [
    { label: 'A', seatCount: 16, tier: 'CLASSIC' },
    { label: 'B', seatCount: 16, tier: 'CLASSIC' },
    { label: 'C', seatCount: 16, tier: 'CLASSIC' },
    { label: 'D', seatCount: 16, tier: 'PRIME' },
    { label: 'E', seatCount: 16, tier: 'PRIME' },
    { label: 'F', seatCount: 12, tier: 'RECLINER' },
  ],
  aisleAfterColumns: [4, 12],
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

async function ensureScreen(theaterId: string, name: string, screenLayout: ScreenLayout) {
  const [existing] = await db
    .select()
    .from(screens)
    .where(and(eq(screens.theaterId, theaterId), eq(screens.name, name)))
    .limit(1);
  if (existing) {
    const [updated] = await db
      .update(screens)
      .set({ layout: screenLayout, updatedAt: new Date() })
      .where(eq(screens.id, existing.id))
      .returning();
    if (!updated) throw new Error('Could not update showcase screen');
    return updated;
  }

  const [created] = await db
    .insert(screens)
    .values({ theaterId, name, layout: screenLayout })
    .returning();
  if (!created) throw new Error('Could not create showcase screen');
  return created;
}

async function seedShowcase() {
  const organizer = await ensureOrganizer();
  const theater = await ensureTheater(organizer.id);
  const [screenA, screenB, eventStage] = await Promise.all([
    ensureScreen(theater.id, 'Showcase Screen A', layout),
    ensureScreen(theater.id, 'Showcase Screen B', layout),
    ensureScreen(theater.id, 'Live Events Stage', eventLayout),
  ]);
  const catalog = await db
    .select({ id: movies.id, title: movies.title, contentType: movies.contentType })
    .from(movies)
    .where(eq(movies.status, 'published'))
    .orderBy(asc(movies.title));

  let createdCount = 0;
  for (let dayOffset = 1; dayOffset <= 5; dayOffset += 1) {
    const date = indiaDateAfter(dayOffset);
    let movieIndex = 0;
    let eventIndex = 0;
    for (const movie of catalog) {
      const isEvent = movie.contentType === 'event';
      const screen = isEvent ? eventStage : movieIndex % 2 === 0 ? screenA : screenB;
      const slot = isEvent ? eventIndex : Math.floor(movieIndex / 2);
      const schedule = isEvent ? eventShowTimes : movieShowTimes;
      const time = schedule[slot % schedule.length];
      if (isEvent) eventIndex += 1;
      else movieIndex += 1;
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
    `Showcase ready: ${catalog.length} listings, ${createdCount} new shows, ${theater.name}.\n`,
  );
}

try {
  await seedShowcase();
} finally {
  await pool.end();
  if (redis.status !== 'wait' && redis.status !== 'end') redis.disconnect();
}
