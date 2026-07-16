import { sql } from 'drizzle-orm';
import {
  check,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { users } from './users.js';

export const movieStatus = pgEnum('movie_status', ['draft', 'published', 'archived']);

export const movies = pgTable(
  'movies',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    title: varchar('title', { length: 200 }).notNull(),
    description: text('description').notNull(),
    posterUrl: varchar('poster_url', { length: 2048 }).notNull(),
    posterAssetKey: varchar('poster_asset_key', { length: 255 }),
    bannerUrl: varchar('banner_url', { length: 2048 }),
    bannerAssetKey: varchar('banner_asset_key', { length: 255 }),
    genres: text('genres').array().notNull(),
    languages: text('languages').array().notNull(),
    durationMin: integer('duration_min').notNull(),
    certificate: varchar('certificate', { length: 16 }).notNull(),
    rating: numeric('rating', { precision: 3, scale: 1, mode: 'number' }).notNull(),
    releaseDate: date('release_date').notNull(),
    status: movieStatus('status').default('draft').notNull(),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('movies_status_release_idx').on(table.status, table.releaseDate),
    index('movies_genres_gin_idx').using('gin', table.genres),
    index('movies_languages_gin_idx').using('gin', table.languages),
    check('movies_duration_positive', sql`${table.durationMin} > 0`),
    check('movies_rating_range', sql`${table.rating} >= 0 AND ${table.rating} <= 10`),
    check('movies_genres_nonempty', sql`cardinality(${table.genres}) > 0`),
    check('movies_languages_nonempty', sql`cardinality(${table.languages}) > 0`),
  ],
);

export type Movie = typeof movies.$inferSelect;
export type NewMovie = typeof movies.$inferInsert;
