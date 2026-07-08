import type pg from "pg";

export async function findOrderByIdempotencyKey(client: pg.PoolClient, idempotencyKey: string) {
  const result = await client.query(
    `SELECT o.id AS "orderId", o.status, o.amount_cents AS "amountCents", o.event_id AS "eventId",
            oi.seat_id AS "seatId"
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
      WHERE o.idempotency_key = $1`,
    [idempotencyKey]
  );
  return result.rows[0] ?? null;
}

export async function confirmSeatOrder(
  client: pg.PoolClient,
  input: {
    userId: string;
    eventId: string;
    seatId: string;
    idempotencyKey: string;
    providerRef: string;
    paymentStatus: "succeeded" | "failed";
  }
) {
  const seatResult = await client.query(
    `UPDATE seats
        SET status = 'sold'
      WHERE id = $1 AND event_id = $2 AND status = 'available'
      RETURNING id, ticket_type_id AS "ticketTypeId"`,
    [input.seatId, input.eventId]
  );
  if (!seatResult.rowCount) return null;

  const priceResult = await client.query(
    `SELECT price_cents AS "priceCents"
       FROM ticket_types
      WHERE id = $1`,
    [seatResult.rows[0].ticketTypeId]
  );
  const amountCents = priceResult.rows[0].priceCents as number;

  const orderResult = await client.query(
    `INSERT INTO orders (user_id, event_id, amount_cents, status, idempotency_key)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [input.userId, input.eventId, amountCents, input.paymentStatus === "succeeded" ? "confirmed" : "failed", input.idempotencyKey]
  );

  await client.query(
    `INSERT INTO order_items (order_id, seat_id, ticket_type_id, qty, price_cents)
     VALUES ($1, $2, $3, 1, $4)`,
    [orderResult.rows[0].id, input.seatId, seatResult.rows[0].ticketTypeId, amountCents]
  );

  await client.query(
    `INSERT INTO payments (order_id, provider_ref, status)
     VALUES ($1, $2, $3)`,
    [orderResult.rows[0].id, input.providerRef, input.paymentStatus]
  );

  return {
    orderId: orderResult.rows[0].id as string,
    eventId: input.eventId,
    seatId: input.seatId,
    amountCents,
    status: input.paymentStatus === "succeeded" ? "confirmed" : "failed"
  };
}
