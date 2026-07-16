import { eq, or } from 'drizzle-orm';

import { db } from '../../config/db.js';
import { env } from '../../config/env.js';
import { users, type User } from '../../db/schema/users.js';

type Identity = {
  firebaseUid: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  provider: 'google' | 'password';
};

export async function upsertIdentity(identity: Identity): Promise<User> {
  const email = identity.email.trim().toLowerCase();
  const seededRole = email === env.ADMIN_SEED_EMAIL?.toLowerCase() ? 'ADMIN' : undefined;
  const [existing] = await db
    .select()
    .from(users)
    .where(or(eq(users.firebaseUid, identity.firebaseUid), eq(users.email, email)))
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(users)
      .set({
        email,
        name: identity.name,
        avatarUrl: identity.avatarUrl ?? null,
        firebaseUid: identity.firebaseUid,
        provider: identity.provider,
        ...(seededRole ? { role: seededRole } : {}),
      })
      .where(eq(users.id, existing.id))
      .returning();

    if (!updated) throw new Error('Failed to update authenticated user');
    return updated;
  }

  const [created] = await db
    .insert(users)
    .values({
      email,
      name: identity.name,
      avatarUrl: identity.avatarUrl ?? null,
      firebaseUid: identity.firebaseUid,
      provider: identity.provider,
      role: seededRole,
    })
    .returning();

  if (!created) throw new Error('Failed to create authenticated user');
  return created;
}

export async function findUserById(id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user;
}
