import { pool } from "../../config/db";
import type { Role } from "../../types";

export interface UserRow {
  id: string;
  email: string;
  name: string;
  role: Role;
  password_hash: string;
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const result = await pool.query<UserRow>("SELECT * FROM users WHERE email = $1", [email]);
  return result.rows[0] ?? null;
}

export async function createUser(input: {
  email: string;
  name: string;
  role: Role;
  passwordHash: string;
}): Promise<UserRow> {
  const result = await pool.query<UserRow>(
    `INSERT INTO users (email, name, role, password_hash)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [input.email, input.name, input.role, input.passwordHash]
  );
  return result.rows[0];
}

export async function upsertExternalUser(input: {
  email: string;
  name: string;
  role: Role;
}): Promise<UserRow> {
  const result = await pool.query<UserRow>(
    `INSERT INTO users (email, name, role, password_hash)
     VALUES ($1, $2, $3, 'external-auth')
     ON CONFLICT (email)
     DO UPDATE SET
       name = EXCLUDED.name,
       role = CASE WHEN users.role = 'organizer' THEN users.role ELSE EXCLUDED.role END
     RETURNING *`,
    [input.email, input.name, input.role]
  );
  return result.rows[0];
}
