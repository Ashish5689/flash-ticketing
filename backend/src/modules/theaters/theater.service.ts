import { and, asc, eq, inArray } from 'drizzle-orm';
import type { z } from 'zod';

import { db } from '../../config/db.js';
import { shows } from '../../db/schema/shows.js';
import { screens, theaters } from '../../db/schema/theaters.js';
import { AppError } from '../../shared/errors.js';
import type {
  screenInputSchema,
  screenUpdateSchema,
  theaterInputSchema,
  theaterUpdateSchema,
} from './theater.schemas.js';

type TheaterInput = z.infer<typeof theaterInputSchema>;
type TheaterUpdate = z.infer<typeof theaterUpdateSchema>;
type ScreenInput = z.infer<typeof screenInputSchema>;
type ScreenUpdate = z.infer<typeof screenUpdateSchema>;

async function getOwnedTheater(theaterId: string, organizerId: string) {
  const [theater] = await db
    .select()
    .from(theaters)
    .where(and(eq(theaters.id, theaterId), eq(theaters.organizerId, organizerId)))
    .limit(1);
  if (!theater) throw new AppError(404, 'THEATER_NOT_FOUND', 'Theater was not found');
  return theater;
}

async function getOwnedScreen(screenId: string, organizerId: string) {
  const [result] = await db
    .select({ screen: screens })
    .from(screens)
    .innerJoin(theaters, eq(screens.theaterId, theaters.id))
    .where(and(eq(screens.id, screenId), eq(theaters.organizerId, organizerId)))
    .limit(1);
  if (!result) throw new AppError(404, 'SCREEN_NOT_FOUND', 'Screen was not found');
  return result.screen;
}

export async function listOrganizerTheaters(organizerId: string) {
  const ownedTheaters = await db
    .select()
    .from(theaters)
    .where(eq(theaters.organizerId, organizerId))
    .orderBy(asc(theaters.name));
  if (ownedTheaters.length === 0) return [];

  const theaterScreens = await db
    .select()
    .from(screens)
    .where(
      inArray(
        screens.theaterId,
        ownedTheaters.map((theater) => theater.id),
      ),
    )
    .orderBy(asc(screens.name));
  const screensByTheater = new Map<string, typeof theaterScreens>();
  for (const screen of theaterScreens) {
    const list = screensByTheater.get(screen.theaterId) ?? [];
    list.push(screen);
    screensByTheater.set(screen.theaterId, list);
  }
  return ownedTheaters.map((theater) => ({
    ...theater,
    screens: screensByTheater.get(theater.id) ?? [],
  }));
}

export async function createTheater(organizerId: string, input: TheaterInput) {
  const [theater] = await db
    .insert(theaters)
    .values({ organizerId, ...input })
    .returning();
  if (!theater) throw new Error('Failed to create theater');
  return { ...theater, screens: [] };
}

export async function updateTheater(id: string, organizerId: string, input: TheaterUpdate) {
  const [theater] = await db
    .update(theaters)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(theaters.id, id), eq(theaters.organizerId, organizerId)))
    .returning();
  if (!theater) throw new AppError(404, 'THEATER_NOT_FOUND', 'Theater was not found');
  return theater;
}

export async function deleteTheater(id: string, organizerId: string) {
  await getOwnedTheater(id, organizerId);
  const [scheduledShow] = await db
    .select({ id: shows.id })
    .from(shows)
    .innerJoin(screens, eq(shows.screenId, screens.id))
    .where(eq(screens.theaterId, id))
    .limit(1);
  if (scheduledShow) {
    throw new AppError(
      409,
      'THEATER_HAS_SHOWS',
      'Set this theater inactive instead; theaters with show history cannot be deleted',
    );
  }
  const [theater] = await db
    .delete(theaters)
    .where(and(eq(theaters.id, id), eq(theaters.organizerId, organizerId)))
    .returning({ id: theaters.id });
  if (!theater) throw new AppError(404, 'THEATER_NOT_FOUND', 'Theater was not found');
}

export async function createScreen(theaterId: string, organizerId: string, input: ScreenInput) {
  await getOwnedTheater(theaterId, organizerId);
  const normalizedLayout = {
    ...input.layout,
    rows: input.layout.rows.map((row) => ({ ...row, label: row.label.toUpperCase() })),
    aisleAfterColumns: [...input.layout.aisleAfterColumns].sort((a, b) => a - b),
  };
  const [screen] = await db
    .insert(screens)
    .values({ theaterId, name: input.name, layout: normalizedLayout })
    .returning();
  if (!screen) throw new Error('Failed to create screen');
  return screen;
}

export async function updateScreen(id: string, organizerId: string, input: ScreenUpdate) {
  await getOwnedScreen(id, organizerId);
  const normalizedLayout = input.layout
    ? {
        ...input.layout,
        rows: input.layout.rows.map((row) => ({ ...row, label: row.label.toUpperCase() })),
        aisleAfterColumns: [...input.layout.aisleAfterColumns].sort((a, b) => a - b),
      }
    : undefined;
  const [screen] = await db
    .update(screens)
    .set({
      ...input,
      ...(normalizedLayout ? { layout: normalizedLayout } : {}),
      updatedAt: new Date(),
    })
    .where(eq(screens.id, id))
    .returning();
  if (!screen) throw new Error('Failed to update screen');
  return screen;
}

export async function deleteScreen(id: string, organizerId: string) {
  await getOwnedScreen(id, organizerId);
  const [scheduledShow] = await db
    .select({ id: shows.id })
    .from(shows)
    .where(eq(shows.screenId, id))
    .limit(1);
  if (scheduledShow) {
    throw new AppError(409, 'SCREEN_HAS_SHOWS', 'Screens with show history cannot be deleted');
  }
  await db.delete(screens).where(eq(screens.id, id));
}
