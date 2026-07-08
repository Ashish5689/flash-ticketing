import fs from "fs/promises";
import path from "path";
import { pool } from "../config/db";
import { logger } from "../shared/logger";

async function main() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const migrationsDir = path.resolve(process.cwd(), "migrations");
  const files = (await fs.readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort();
  for (const file of files) {
    const applied = await pool.query("SELECT 1 FROM schema_migrations WHERE filename = $1", [file]);
    if (applied.rowCount) continue;
    const sql = await fs.readFile(path.join(migrationsDir, file), "utf8");
    await pool.query("BEGIN");
    try {
      await pool.query(sql);
      await pool.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
      await pool.query("COMMIT");
      logger.info({ file }, "Applied migration");
    } catch (error) {
      await pool.query("ROLLBACK");
      throw error;
    }
  }
}

main()
  .catch((error) => {
    logger.error({ error }, "Migration failed");
    process.exitCode = 1;
  })
  .finally(() => pool.end());
