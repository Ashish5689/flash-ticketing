import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { movies } from './movies.js';
import { screens } from './theaters.js';

export const showStatus = pgEnum('show_status', ['scheduled', 'onsale', 'closed', 'cancelled']);
export const seatTier = pgEnum('seat_tier', ['CLASSIC', 'PRIME', 'RECLINER']);
export const showSeatStatus = pgEnum('show_seat_status', ['available', 'sold']);

export const shows = pgTable(
  'shows',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    movieId: uuid('movie_id')
      .notNull()
      .references(() => movies.id, { onDelete: 'restrict' }),
    screenId: uuid('screen_id')
      .notNull()
      .references(() => screens.id, { onDelete: 'restrict' }),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    status: showStatus('status').default('scheduled').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('shows_screen_starts_unique').on(table.screenId, table.startsAt),
    index('shows_movie_status_starts_idx').on(table.movieId, table.status, table.startsAt),
    index('shows_screen_status_starts_idx').on(table.screenId, table.status, table.startsAt),
  ],
);

export const showPricing = pgTable(
  'show_pricing',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    showId: uuid('show_id')
      .notNull()
      .references(() => shows.id, { onDelete: 'cascade' }),
    tier: seatTier('tier').notNull(),
    priceCents: integer('price_cents').notNull(),
  },
  (table) => [
    uniqueIndex('show_pricing_show_tier_unique').on(table.showId, table.tier),
    index('show_pricing_show_idx').on(table.showId),
    check('show_pricing_price_positive', sql`${table.priceCents} > 0`),
  ],
);

export const showSeats = pgTable(
  'show_seats',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    showId: uuid('show_id')
      .notNull()
      .references(() => shows.id, { onDelete: 'cascade' }),
    seatLabel: varchar('seat_label', { length: 12 }).notNull(),
    rowLabel: varchar('row_label', { length: 4 }).notNull(),
    seatNumber: integer('seat_number').notNull(),
    tier: seatTier('tier').notNull(),
    status: showSeatStatus('status').default('available').notNull(),
  },
  (table) => [
    uniqueIndex('show_seats_show_label_unique').on(table.showId, table.seatLabel),
    index('show_seats_show_status_idx').on(table.showId, table.status),
    index('show_seats_show_tier_idx').on(table.showId, table.tier),
    check('show_seats_number_positive', sql`${table.seatNumber} > 0`),
  ],
);

export type Show = typeof shows.$inferSelect;
export type NewShow = typeof shows.$inferInsert;
export type ShowPricing = typeof showPricing.$inferSelect;
export type ShowSeat = typeof showSeats.$inferSelect;
