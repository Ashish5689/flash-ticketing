import { and, asc, count, desc, eq, ilike, inArray, sql, sum, type SQL } from 'drizzle-orm';
import type { z } from 'zod';

import { db } from '../../config/db.js';
import { redis } from '../../config/redis.js';
import { orderItems, orders } from '../../db/schema/bookings.js';
import { movies } from '../../db/schema/movies.js';
import { organizerProfiles } from '../../db/schema/organizers.js';
import { showSeats, shows } from '../../db/schema/shows.js';
import { screens, theaters } from '../../db/schema/theaters.js';
import { users } from '../../db/schema/users.js';
import { AppError } from '../../shared/errors.js';
import type { adminUserQuerySchema } from './analytics.schemas.js';

type AdminUserQuery = z.infer<typeof adminUserQuerySchema>;

export async function organizerDashboard(organizerId: string) {
  const ownedShows = await db
    .select({
      id: shows.id,
      startsAt: shows.startsAt,
      status: shows.status,
      movieTitle: movies.title,
      theaterName: theaters.name,
      screenName: screens.name,
    })
    .from(shows)
    .innerJoin(movies, eq(shows.movieId, movies.id))
    .innerJoin(screens, eq(shows.screenId, screens.id))
    .innerJoin(theaters, eq(screens.theaterId, theaters.id))
    .where(eq(theaters.organizerId, organizerId))
    .orderBy(desc(shows.startsAt));
  if (ownedShows.length === 0) {
    return {
      summary: { shows: 0, sold: 0, held: 0, available: 0, revenueCents: 0 },
      shows: [],
    };
  }
  const ids = ownedShows.map((show) => show.id);
  const [seatRows, revenueRows] = await Promise.all([
    db
      .select({ showId: showSeats.showId, label: showSeats.seatLabel, status: showSeats.status })
      .from(showSeats)
      .where(inArray(showSeats.showId, ids)),
    db
      .select({ showId: orders.showId, revenueCents: sum(orderItems.priceCents) })
      .from(orders)
      .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
      .where(and(inArray(orders.showId, ids), eq(orders.status, 'confirmed')))
      .groupBy(orders.showId),
  ]);
  const availableSeats = seatRows.filter((seat) => seat.status === 'available');
  const holdValues = availableSeats.length
    ? await redis.mget(availableSeats.map((seat) => `hold:${seat.showId}:${seat.label}`))
    : [];
  const statsByShow = new Map<
    string,
    { sold: number; held: number; available: number; revenueCents: number }
  >();
  for (const show of ownedShows) {
    statsByShow.set(show.id, { sold: 0, held: 0, available: 0, revenueCents: 0 });
  }
  let availableIndex = 0;
  for (const seat of seatRows) {
    const stats = statsByShow.get(seat.showId)!;
    if (seat.status === 'sold') stats.sold += 1;
    else if (holdValues[availableIndex++]) stats.held += 1;
    else stats.available += 1;
  }
  for (const row of revenueRows) {
    const stats = statsByShow.get(row.showId);
    if (stats) stats.revenueCents = Number(row.revenueCents ?? 0);
  }
  const showStats = ownedShows.map((show) => ({ ...show, ...statsByShow.get(show.id)! }));
  const summary = showStats.reduce(
    (total, show) => ({
      shows: total.shows + 1,
      sold: total.sold + show.sold,
      held: total.held + show.held,
      available: total.available + show.available,
      revenueCents: total.revenueCents + show.revenueCents,
    }),
    { shows: 0, sold: 0, held: 0, available: 0, revenueCents: 0 },
  );
  return { summary, shows: showStats };
}

export async function platformDashboard() {
  const [userCounts, movieCount, theaterCount, showCount, bookingStats, pendingOrganizers] =
    await Promise.all([
      db
        .select({
          total: count(),
          active: sql<number>`count(*) filter (where ${users.status} = 'active')`,
          suspended: sql<number>`count(*) filter (where ${users.status} = 'suspended')`,
          organizers: sql<number>`count(*) filter (where ${users.role} = 'ORGANIZER')`,
        })
        .from(users),
      db.select({ value: count() }).from(movies),
      db.select({ value: count() }).from(theaters),
      db.select({ value: count() }).from(shows),
      db
        .select({ bookings: count(), revenueCents: sum(orders.amountCents) })
        .from(orders)
        .where(eq(orders.status, 'confirmed')),
      db
        .select({ value: count() })
        .from(organizerProfiles)
        .where(eq(organizerProfiles.status, 'pending')),
    ]);
  return {
    users: {
      total: Number(userCounts[0]?.total ?? 0),
      active: Number(userCounts[0]?.active ?? 0),
      suspended: Number(userCounts[0]?.suspended ?? 0),
      organizers: Number(userCounts[0]?.organizers ?? 0),
    },
    movies: Number(movieCount[0]?.value ?? 0),
    theaters: Number(theaterCount[0]?.value ?? 0),
    shows: Number(showCount[0]?.value ?? 0),
    bookings: Number(bookingStats[0]?.bookings ?? 0),
    revenueCents: Number(bookingStats[0]?.revenueCents ?? 0),
    pendingOrganizers: Number(pendingOrganizers[0]?.value ?? 0),
  };
}

export function listAdminUsers(query: AdminUserQuery) {
  const conditions: SQL[] = [];
  if (query.q) {
    conditions.push(
      sql`(${ilike(users.name, `%${query.q}%`)} or ${ilike(users.email, `%${query.q}%`)})`,
    );
  }
  if (query.role) conditions.push(eq(users.role, query.role));
  if (query.status) conditions.push(eq(users.status, query.status));
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status,
      provider: users.provider,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(users.createdAt), asc(users.email))
    .limit(200);
}

export async function updateUserStatus(
  id: string,
  status: 'active' | 'suspended',
  adminId: string,
) {
  if (id === adminId && status === 'suspended') {
    throw new AppError(409, 'CANNOT_SUSPEND_SELF', 'You cannot suspend your own admin account');
  }
  const [user] = await db.update(users).set({ status }).where(eq(users.id, id)).returning({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    status: users.status,
  });
  if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User was not found');
  if (status === 'suspended') await redis.set(`account:suspended:${id}`, '1');
  else await redis.del(`account:suspended:${id}`);
  return user;
}
