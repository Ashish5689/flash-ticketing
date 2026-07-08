import bcrypt from "bcryptjs";
import { pool } from "../config/db";
import { logger } from "../shared/logger";

async function main() {
  const passwordHash = await bcrypt.hash("password123", 12);
  const organizer = await pool.query(
    `INSERT INTO users (email, name, role, password_hash)
     VALUES ('organizer@example.com', 'Organizer Demo', 'organizer', $1)
     ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
     RETURNING id`,
    [passwordHash]
  );
  await pool.query(
    `INSERT INTO users (email, name, role, password_hash)
     VALUES ('buyer@example.com', 'Buyer Demo', 'buyer', $1)
     ON CONFLICT (email) DO NOTHING`,
    [passwordHash]
  );

  const event = await pool.query(
    `INSERT INTO events (organizer_id, name, venue, starts_at, status)
     VALUES ($1, 'Neon Nights Arena Drop', 'Mumbai Dome', now() + interval '14 days', 'onsale')
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [organizer.rows[0].id]
  );

  if (event.rows[0]) {
    const ticketType = await pool.query(
      `INSERT INTO ticket_types (event_id, name, price_cents, total_qty)
       VALUES ($1, 'Floor', 4999, 48)
       RETURNING id`,
      [event.rows[0].id]
    );
    const labels = Array.from({ length: 48 }, (_, i) => `${String.fromCharCode(65 + Math.floor(i / 8))}${(i % 8) + 1}`);
    for (const label of labels) {
      await pool.query(
        `INSERT INTO seats (event_id, seat_label, ticket_type_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (event_id, seat_label) DO NOTHING`,
        [event.rows[0].id, label, ticketType.rows[0].id]
      );
    }
  }

  logger.info("Seed complete. Demo users use password: password123");
}

main()
  .catch((error) => {
    logger.error({ error }, "Seed failed");
    process.exitCode = 1;
  })
  .finally(() => pool.end());
