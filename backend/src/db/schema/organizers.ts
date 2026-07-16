import {
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

export const organizerApplicationStatus = pgEnum('organizer_application_status', [
  'pending',
  'approved',
  'rejected',
]);

export const organizerProfiles = pgTable(
  'organizer_profiles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    businessName: varchar('business_name', { length: 180 }).notNull(),
    phone: varchar('phone', { length: 32 }).notNull(),
    documents: jsonb('documents').$type<string[]>().default([]).notNull(),
    status: organizerApplicationStatus('status').default('pending').notNull(),
    reviewNote: varchar('review_note', { length: 500 }),
    reviewedBy: uuid('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('organizer_profiles_user_unique').on(table.userId),
    index('organizer_profiles_status_created_idx').on(table.status, table.createdAt),
  ],
);

export type OrganizerProfile = typeof organizerProfiles.$inferSelect;
