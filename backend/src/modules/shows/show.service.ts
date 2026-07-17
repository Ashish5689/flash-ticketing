import { and, asc, eq, gte, ilike, inArray, lt, type SQL } from 'drizzle-orm';
import type { z } from 'zod';

import { db } from '../../config/db.js';
import { redis } from '../../config/redis.js';
import { movies } from '../../db/schema/movies.js';
import { showPricing, showSeats, shows } from '../../db/schema/shows.js';
import { screens, theaters, type ScreenLayout, type SeatTier } from '../../db/schema/theaters.js';
import { AppError } from '../../shared/errors.js';
import {
  addIndiaDays,
  buildIndiaDateCounts,
  indiaDayRange,
  todayInIndia,
} from '../../shared/india-date.js';
import type {
  organizerShowQuerySchema,
  showDateQuerySchema,
  showInputSchema,
  showtimeQuerySchema,
} from './show.schemas.js';

type ShowInput = z.infer<typeof showInputSchema>;
type ShowtimeQuery = z.infer<typeof showtimeQuerySchema>;
type ShowDateQuery = z.infer<typeof showDateQuerySchema>;
type OrganizerShowQuery = z.infer<typeof organizerShowQuerySchema>;

const minimumShowLeadMs = 15 * 60 * 1000;

export function expandSeatLayout(layout: ScreenLayout) {
  return layout.rows.flatMap((row) =>
    Array.from({ length: row.seatCount }, (_, index) => ({
      seatLabel: `${row.label.toUpperCase()}${index + 1}`,
      rowLabel: row.label.toUpperCase(),
      seatNumber: index + 1,
      tier: row.tier,
      status: 'available' as const,
    })),
  );
}

function usedTiers(layout: ScreenLayout) {
  return new Set(layout.rows.map((row) => row.tier));
}

function assertPricingCoversLayout(layout: ScreenLayout, pricing: ShowInput['pricing']) {
  const required = usedTiers(layout);
  const provided = new Set(pricing.map((price) => price.tier));
  const missing = [...required].filter((tier) => !provided.has(tier));
  const unused = [...provided].filter((tier) => !required.has(tier));
  if (missing.length > 0 || unused.length > 0) {
    throw new AppError(
      400,
      'INVALID_SHOW_PRICING',
      `Price exactly the screen tiers in use${missing.length ? `; missing ${missing.join(', ')}` : ''}${unused.length ? `; unused ${unused.join(', ')}` : ''}`,
    );
  }
}

async function screenForOrganizer(screenId: string, organizerId: string) {
  const [result] = await db
    .select({ screen: screens, theater: theaters })
    .from(screens)
    .innerJoin(theaters, eq(screens.theaterId, theaters.id))
    .where(and(eq(screens.id, screenId), eq(theaters.organizerId, organizerId)))
    .limit(1);
  if (!result) throw new AppError(404, 'SCREEN_NOT_FOUND', 'Screen was not found');
  if (result.theater.status !== 'active') {
    throw new AppError(409, 'THEATER_INACTIVE', 'Activate the theater before scheduling shows');
  }
  return result;
}

async function publishedMovie(movieId: string) {
  const [movie] = await db
    .select({ id: movies.id, title: movies.title })
    .from(movies)
    .where(and(eq(movies.id, movieId), eq(movies.status, 'published')))
    .limit(1);
  if (!movie) throw new AppError(404, 'MOVIE_NOT_FOUND', 'Published movie was not found');
  return movie;
}

export async function createShow(organizerId: string, input: ShowInput) {
  const startsAt = new Date(input.startsAt);
  if (startsAt.getTime() < Date.now() + minimumShowLeadMs) {
    throw new AppError(400, 'SHOW_START_TOO_SOON', 'Schedule shows at least 15 minutes ahead');
  }
  const [{ screen, theater }, movie] = await Promise.all([
    screenForOrganizer(input.screenId, organizerId),
    publishedMovie(input.movieId),
  ]);
  assertPricingCoversLayout(screen.layout, input.pricing);

  return db.transaction(async (tx) => {
    const [show] = await tx
      .insert(shows)
      .values({ movieId: movie.id, screenId: screen.id, startsAt })
      .returning();
    if (!show) throw new Error('Failed to create show');
    await tx.insert(showPricing).values(
      input.pricing.map((price) => ({
        showId: show.id,
        tier: price.tier,
        priceCents: price.priceCents,
      })),
    );
    return { ...show, movie, screen, theater, pricing: input.pricing };
  });
}

export async function listOrganizerShows(organizerId: string, query: OrganizerShowQuery) {
  const conditions: SQL[] = [eq(theaters.organizerId, organizerId)];
  if (query.status) conditions.push(eq(shows.status, query.status));
  const rows = await db
    .select({
      show: shows,
      movie: { id: movies.id, title: movies.title, posterUrl: movies.posterUrl },
      screen: { id: screens.id, name: screens.name },
      theater: { id: theaters.id, name: theaters.name, city: theaters.city },
    })
    .from(shows)
    .innerJoin(movies, eq(shows.movieId, movies.id))
    .innerJoin(screens, eq(shows.screenId, screens.id))
    .innerJoin(theaters, eq(screens.theaterId, theaters.id))
    .where(and(...conditions))
    .orderBy(asc(shows.startsAt));
  if (rows.length === 0) return [];
  const prices = await db
    .select()
    .from(showPricing)
    .where(
      inArray(
        showPricing.showId,
        rows.map(({ show }) => show.id),
      ),
    )
    .orderBy(asc(showPricing.priceCents));
  const pricesByShow = new Map<string, typeof prices>();
  for (const price of prices) {
    const list = pricesByShow.get(price.showId) ?? [];
    list.push(price);
    pricesByShow.set(price.showId, list);
  }
  return rows.map(({ show, ...relations }) => ({
    ...show,
    ...relations,
    pricing: pricesByShow.get(show.id) ?? [],
  }));
}

export async function publishShow(showId: string, organizerId: string) {
  return db.transaction(async (tx) => {
    const [result] = await tx
      .select({ show: shows, screen: screens })
      .from(shows)
      .innerJoin(screens, eq(shows.screenId, screens.id))
      .innerJoin(theaters, eq(screens.theaterId, theaters.id))
      .where(and(eq(shows.id, showId), eq(theaters.organizerId, organizerId)))
      .limit(1)
      .for('update');
    if (!result) throw new AppError(404, 'SHOW_NOT_FOUND', 'Show was not found');
    if (result.show.status !== 'scheduled') {
      throw new AppError(409, 'SHOW_NOT_SCHEDULED', 'Only scheduled shows can go on sale');
    }
    if (result.show.startsAt.getTime() <= Date.now()) {
      throw new AppError(409, 'SHOW_ALREADY_STARTED', 'Past shows cannot go on sale');
    }
    const pricing = await tx
      .select({ tier: showPricing.tier, priceCents: showPricing.priceCents })
      .from(showPricing)
      .where(eq(showPricing.showId, showId));
    assertPricingCoversLayout(result.screen.layout, pricing);
    const seats = expandSeatLayout(result.screen.layout);
    await tx.insert(showSeats).values(seats.map((seat) => ({ showId, ...seat })));
    const [show] = await tx
      .update(shows)
      .set({ status: 'onsale', updatedAt: new Date() })
      .where(eq(shows.id, showId))
      .returning();
    if (!show) throw new Error('Failed to publish show');
    return { ...show, seatCount: seats.length };
  });
}

export async function cancelShow(showId: string, organizerId: string) {
  const [owned] = await db
    .select({ id: shows.id })
    .from(shows)
    .innerJoin(screens, eq(shows.screenId, screens.id))
    .innerJoin(theaters, eq(screens.theaterId, theaters.id))
    .where(and(eq(shows.id, showId), eq(theaters.organizerId, organizerId)))
    .limit(1);
  if (!owned) throw new AppError(404, 'SHOW_NOT_FOUND', 'Show was not found');
  const [show] = await db
    .update(shows)
    .set({ status: 'cancelled', updatedAt: new Date() })
    .where(and(eq(shows.id, showId), inArray(shows.status, ['scheduled', 'onsale'])))
    .returning();
  if (!show) throw new AppError(409, 'SHOW_NOT_ACTIVE', 'Only active shows can be cancelled');
  return show;
}

export async function listMovieShowtimes(movieId: string, query: ShowtimeQuery) {
  await publishedMovie(movieId);
  const range = indiaDayRange(query.date);
  const rows = await db
    .select({
      show: shows,
      screen: { id: screens.id, name: screens.name },
      theater: {
        id: theaters.id,
        name: theaters.name,
        city: theaters.city,
        address: theaters.address,
      },
    })
    .from(shows)
    .innerJoin(screens, eq(shows.screenId, screens.id))
    .innerJoin(theaters, eq(screens.theaterId, theaters.id))
    .where(
      and(
        eq(shows.movieId, movieId),
        eq(shows.status, 'onsale'),
        eq(theaters.status, 'active'),
        ilike(theaters.city, query.city),
        gte(shows.startsAt, range.start),
        lt(shows.startsAt, range.end),
      ),
    )
    .orderBy(asc(theaters.name), asc(shows.startsAt));
  if (rows.length === 0) return { date: range.date, city: query.city, theaters: [] };
  const prices = await db
    .select()
    .from(showPricing)
    .where(
      inArray(
        showPricing.showId,
        rows.map(({ show }) => show.id),
      ),
    )
    .orderBy(asc(showPricing.priceCents));
  const pricesByShow = new Map<string, typeof prices>();
  for (const price of prices) {
    const list = pricesByShow.get(price.showId) ?? [];
    list.push(price);
    pricesByShow.set(price.showId, list);
  }
  const theaterGroups = new Map<
    string,
    { theater: (typeof rows)[number]['theater']; shows: unknown[] }
  >();
  for (const row of rows) {
    const group = theaterGroups.get(row.theater.id) ?? { theater: row.theater, shows: [] };
    group.shows.push({
      ...row.show,
      screen: row.screen,
      pricing: pricesByShow.get(row.show.id) ?? [],
    });
    theaterGroups.set(row.theater.id, group);
  }
  return { date: range.date, city: query.city, theaters: [...theaterGroups.values()] };
}

export async function listMovieShowDates(movieId: string, query: ShowDateQuery) {
  await publishedMovie(movieId);
  const from = query.from ?? todayInIndia();
  const start = indiaDayRange(from).start;
  const end = indiaDayRange(addIndiaDays(from, query.days)).start;
  const rows = await db
    .select({ startsAt: shows.startsAt })
    .from(shows)
    .innerJoin(screens, eq(shows.screenId, screens.id))
    .innerJoin(theaters, eq(screens.theaterId, theaters.id))
    .where(
      and(
        eq(shows.movieId, movieId),
        eq(shows.status, 'onsale'),
        eq(theaters.status, 'active'),
        ilike(theaters.city, query.city),
        gte(shows.startsAt, start),
        lt(shows.startsAt, end),
      ),
    )
    .orderBy(asc(shows.startsAt));
  return {
    city: query.city,
    dates: buildIndiaDateCounts(
      rows.map(({ startsAt }) => startsAt),
      from,
      query.days,
    ),
  };
}

export async function listShowCities() {
  const rows = await db
    .selectDistinct({ city: theaters.city })
    .from(shows)
    .innerJoin(screens, eq(shows.screenId, screens.id))
    .innerJoin(theaters, eq(screens.theaterId, theaters.id))
    .where(
      and(
        eq(shows.status, 'onsale'),
        eq(theaters.status, 'active'),
        gte(shows.startsAt, new Date()),
      ),
    )
    .orderBy(asc(theaters.city));
  return rows.map(({ city }) => city);
}

export async function getPublicShow(showId: string) {
  const [result] = await db
    .select({
      show: shows,
      movie: {
        id: movies.id,
        title: movies.title,
        posterUrl: movies.posterUrl,
        durationMin: movies.durationMin,
        certificate: movies.certificate,
      },
      screen: { id: screens.id, name: screens.name },
      theater: {
        id: theaters.id,
        name: theaters.name,
        city: theaters.city,
        address: theaters.address,
      },
    })
    .from(shows)
    .innerJoin(movies, eq(shows.movieId, movies.id))
    .innerJoin(screens, eq(shows.screenId, screens.id))
    .innerJoin(theaters, eq(screens.theaterId, theaters.id))
    .where(and(eq(shows.id, showId), eq(shows.status, 'onsale'), eq(theaters.status, 'active')))
    .limit(1);
  if (!result) throw new AppError(404, 'SHOW_NOT_FOUND', 'On-sale show was not found');
  const pricing = await db
    .select({ tier: showPricing.tier, priceCents: showPricing.priceCents })
    .from(showPricing)
    .where(eq(showPricing.showId, showId))
    .orderBy(asc(showPricing.priceCents));
  return {
    ...result.show,
    movie: result.movie,
    screen: result.screen,
    theater: result.theater,
    pricing,
  };
}

export async function getShowSeatMap(showId: string) {
  const show = await getPublicShow(showId);
  const [screen] = await db
    .select({ layout: screens.layout })
    .from(screens)
    .where(eq(screens.id, show.screen.id))
    .limit(1);
  const seats = await db
    .select()
    .from(showSeats)
    .where(eq(showSeats.showId, showId))
    .orderBy(asc(showSeats.rowLabel), asc(showSeats.seatNumber));
  const holdValues =
    seats.length > 0
      ? await redis.mget(seats.map((seat) => `hold:${showId}:${seat.seatLabel}`))
      : [];
  const rows = new Map<
    string,
    {
      label: string;
      tier: SeatTier;
      seats: Array<{
        id: string;
        label: string;
        number: number;
        tier: SeatTier;
        status: 'available' | 'held' | 'sold';
      }>;
    }
  >();
  seats.forEach((seat, index) => {
    const row = rows.get(seat.rowLabel) ?? { label: seat.rowLabel, tier: seat.tier, seats: [] };
    row.seats.push({
      id: seat.id,
      label: seat.seatLabel,
      number: seat.seatNumber,
      tier: seat.tier,
      status: (seat.status === 'sold' ? 'sold' : holdValues[index] ? 'held' : 'available') as
        'available' | 'held' | 'sold',
    });
    rows.set(seat.rowLabel, row);
  });
  return {
    show,
    layout: { aisleAfterColumns: screen?.layout.aisleAfterColumns ?? [], rows: [...rows.values()] },
  };
}
