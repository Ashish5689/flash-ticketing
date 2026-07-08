import type pg from "pg";
import { pool } from "../../config/db";

export async function listEvents() {
  const result = await pool.query(
    `SELECT e.id, e.name, e.venue, e.starts_at AS "startsAt", e.status,
            COUNT(s.id)::int AS "totalSeats",
            COUNT(s.id) FILTER (WHERE s.status = 'sold')::int AS "soldCount"
       FROM events e
       LEFT JOIN seats s ON s.event_id = e.id
      GROUP BY e.id
      ORDER BY e.starts_at ASC`
  );
  return result.rows;
}

export async function getEvent(id: string) {
  const eventResult = await pool.query(
    `SELECT id, name, venue, starts_at AS "startsAt", status
       FROM events
      WHERE id = $1`,
    [id]
  );
  if (!eventResult.rowCount) return null;

  const seatsResult = await pool.query(
    `SELECT s.id, s.seat_label AS "seatLabel", s.status,
            tt.id AS "ticketTypeId", tt.name AS "ticketTypeName", tt.price_cents AS "priceCents"
       FROM seats s
       JOIN ticket_types tt ON tt.id = s.ticket_type_id
      WHERE s.event_id = $1
      ORDER BY s.seat_label ASC`,
    [id]
  );

  return { ...eventResult.rows[0], seats: seatsResult.rows };
}

export async function createEvent(input: {
  organizerId: string;
  name: string;
  venue: string;
  startsAt: string;
  status: "draft" | "onsale" | "closed";
}) {
  const result = await pool.query(
    `INSERT INTO events (organizer_id, name, venue, starts_at, status)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, venue, starts_at AS "startsAt", status`,
    [input.organizerId, input.name, input.venue, input.startsAt, input.status]
  );
  return result.rows[0];
}

export async function addSeats(
  client: pg.PoolClient,
  input: {
    eventId: string;
    ticketTypeName: string;
    priceCents: number;
    seatLabels: string[];
  }
) {
  const ticketType = await client.query(
    `INSERT INTO ticket_types (event_id, name, price_cents, total_qty)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, price_cents AS "priceCents", total_qty AS "totalQty"`,
    [input.eventId, input.ticketTypeName, input.priceCents, input.seatLabels.length]
  );

  const values: unknown[] = [];
  const placeholders = input.seatLabels.map((label, index) => {
    values.push(input.eventId, label, ticketType.rows[0].id);
    const offset = index * 3;
    return `($${offset + 1}, $${offset + 2}, $${offset + 3})`;
  });

  await client.query(
    `INSERT INTO seats (event_id, seat_label, ticket_type_id)
     VALUES ${placeholders.join(", ")}`,
    values
  );

  return ticketType.rows[0];
}

export async function findSeatForSale(seatId: string) {
  const result = await pool.query(
    `SELECT s.id, s.event_id AS "eventId", s.status,
            tt.id AS "ticketTypeId", tt.price_cents AS "priceCents"
       FROM seats s
       JOIN ticket_types tt ON tt.id = s.ticket_type_id
      WHERE s.id = $1`,
    [seatId]
  );
  return result.rows[0] ?? null;
}
