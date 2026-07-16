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

import { showSeats, shows } from './shows.js';
import { users } from './users.js';

export const orderStatus = pgEnum('order_status', ['confirmed', 'cancelled']);
export const paymentStatus = pgEnum('payment_status', ['succeeded', 'failed']);

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    showId: uuid('show_id')
      .notNull()
      .references(() => shows.id, { onDelete: 'restrict' }),
    amountCents: integer('amount_cents').notNull(),
    status: orderStatus('status').default('confirmed').notNull(),
    idempotencyKey: uuid('idempotency_key').notNull(),
    ticketCode: varchar('ticket_code', { length: 40 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('orders_idempotency_key_unique').on(table.idempotencyKey),
    uniqueIndex('orders_ticket_code_unique').on(table.ticketCode),
    index('orders_user_created_idx').on(table.userId, table.createdAt),
    index('orders_show_status_idx').on(table.showId, table.status),
    check('orders_amount_positive', sql`${table.amountCents} > 0`),
  ],
);

export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    showSeatId: uuid('show_seat_id')
      .notNull()
      .references(() => showSeats.id, { onDelete: 'restrict' }),
    priceCents: integer('price_cents').notNull(),
  },
  (table) => [
    index('order_items_order_idx').on(table.orderId),
    uniqueIndex('order_items_show_seat_unique').on(table.showSeatId),
    check('order_items_price_positive', sql`${table.priceCents} > 0`),
  ],
);

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    provider: varchar('provider', { length: 40 }).notNull(),
    providerRef: varchar('provider_ref', { length: 120 }).notNull(),
    status: paymentStatus('status').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('payments_order_unique').on(table.orderId),
    uniqueIndex('payments_provider_ref_unique').on(table.providerRef),
  ],
);

export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Payment = typeof payments.$inferSelect;
