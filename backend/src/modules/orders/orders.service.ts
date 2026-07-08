import { pool } from "../../config/db";
import { forbidden, notFound } from "../../shared/errors";

export async function getOrder(userId: string, orderId: string) {
  const result = await pool.query(
    `SELECT o.id, o.user_id AS "userId", o.event_id AS "eventId", o.amount_cents AS "amountCents",
            o.status, o.created_at AS "createdAt", e.name AS "eventName", e.venue,
            s.seat_label AS "seatLabel", tt.name AS "ticketTypeName"
       FROM orders o
       JOIN events e ON e.id = o.event_id
       JOIN order_items oi ON oi.order_id = o.id
       JOIN seats s ON s.id = oi.seat_id
       JOIN ticket_types tt ON tt.id = oi.ticket_type_id
      WHERE o.id = $1`,
    [orderId]
  );
  const order = result.rows[0];
  if (!order) throw notFound("Order not found");
  if (order.userId !== userId) throw forbidden("Order belongs to another user");
  return {
    ...order,
    ticket: {
      code: `FLASH-${String(order.id).slice(0, 8).toUpperCase()}`,
      seatLabel: order.seatLabel
    }
  };
}
