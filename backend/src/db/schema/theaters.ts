import { sql } from 'drizzle-orm';
import {
  check,
  index,
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { users } from './users.js';

export type SeatTier = 'CLASSIC' | 'PRIME' | 'RECLINER';
export type ScreenLayout = {
  rows: Array<{
    label: string;
    seatCount: number;
    tier: SeatTier;
  }>;
  aisleAfterColumns: number[];
};

export const theaterStatus = pgEnum('theater_status', ['active', 'inactive']);

export const theaters = pgTable(
  'theaters',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizerId: uuid('organizer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 180 }).notNull(),
    city: varchar('city', { length: 120 }).notNull(),
    address: varchar('address', { length: 500 }).notNull(),
    status: theaterStatus('status').default('active').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('theaters_organizer_name_unique').on(table.organizerId, table.name),
    index('theaters_organizer_idx').on(table.organizerId),
    index('theaters_city_status_idx').on(table.city, table.status),
  ],
);

export const screens = pgTable(
  'screens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    theaterId: uuid('theater_id')
      .notNull()
      .references(() => theaters.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 120 }).notNull(),
    layout: jsonb('layout').$type<ScreenLayout>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('screens_theater_name_unique').on(table.theaterId, table.name),
    index('screens_theater_idx').on(table.theaterId),
    check('screens_layout_has_rows', sql`jsonb_array_length(${table.layout}->'rows') > 0`),
  ],
);

export type Theater = typeof theaters.$inferSelect;
export type Screen = typeof screens.$inferSelect;
