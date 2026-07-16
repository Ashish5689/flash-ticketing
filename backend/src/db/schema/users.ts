import { index, pgEnum, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

export const userRole = pgEnum('user_role', ['USER', 'ORGANIZER', 'ADMIN']);
export const userStatus = pgEnum('user_status', ['active', 'suspended']);
export const authProvider = pgEnum('auth_provider', ['google', 'password']);

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 320 }).notNull(),
    name: varchar('name', { length: 160 }).notNull(),
    avatarUrl: varchar('avatar_url', { length: 2048 }),
    firebaseUid: varchar('firebase_uid', { length: 128 }).notNull(),
    provider: authProvider('provider').notNull(),
    role: userRole('role').default('USER').notNull(),
    status: userStatus('status').default('active').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('users_email_unique').on(table.email),
    uniqueIndex('users_firebase_uid_unique').on(table.firebaseUid),
    index('users_status_role_created_idx').on(table.status, table.role, table.createdAt),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
