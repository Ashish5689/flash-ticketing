import { pool } from "../config/db";
import { logger } from "../shared/logger";

async function main() {
  const oversold = await pool.query(
    `SELECT e.id, e.name,
            COUNT(s.id)::int AS "totalSeats",
            COUNT(s.id) FILTER (WHERE s.status = 'sold')::int AS "soldSeats"
       FROM events e
       LEFT JOIN seats s ON s.event_id = e.id
      GROUP BY e.id
     HAVING COUNT(s.id) FILTER (WHERE s.status = 'sold') > COUNT(s.id)`
  );

  const duplicateConfirmedSeats = await pool.query(
    `SELECT oi.seat_id AS "seatId", COUNT(*)::int AS "confirmedOrders"
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
      WHERE o.status = 'confirmed'
      GROUP BY oi.seat_id
     HAVING COUNT(*) > 1`
  );

  const summary = {
    ok: oversold.rowCount === 0 && duplicateConfirmedSeats.rowCount === 0,
    oversoldEvents: oversold.rows,
    duplicateConfirmedSeats: duplicateConfirmedSeats.rows
  };

  if (!summary.ok) {
    logger.error(summary, "Ticketing invariants failed");
    process.exitCode = 1;
    return;
  }

  logger.info(summary, "Ticketing invariants passed");
}

main()
  .catch((error) => {
    logger.error({ error }, "Invariant check failed");
    process.exitCode = 1;
  })
  .finally(() => pool.end());
