import { eq } from 'drizzle-orm';

import { db, pool } from '../config/db.js';
import { env } from '../config/env.js';
import { firebaseAuth } from '../config/firebase.js';
import { redis } from '../config/redis.js';
import { users } from '../db/schema/users.js';
import { upsertIdentity } from '../modules/auth/user.service.js';

async function seedAdmin() {
  if (!env.ADMIN_SEED_EMAIL) throw new Error('ADMIN_SEED_EMAIL is not configured');

  try {
    const firebaseUser = await firebaseAuth.getUserByEmail(env.ADMIN_SEED_EMAIL);
    const provider = firebaseUser.providerData.some((item) => item.providerId === 'google.com')
      ? 'google'
      : 'password';
    const user = await upsertIdentity({
      firebaseUid: firebaseUser.uid,
      email: firebaseUser.email ?? env.ADMIN_SEED_EMAIL,
      name: firebaseUser.displayName?.trim() || env.ADMIN_SEED_EMAIL.split('@')[0] || 'Admin',
      avatarUrl: firebaseUser.photoURL,
      provider,
    });
    await db.update(users).set({ role: 'ADMIN' }).where(eq(users.id, user.id));
    process.stdout.write(`Admin role seeded for ${env.ADMIN_SEED_EMAIL}\n`);
  } catch (error) {
    if (
      typeof error === 'object' &&
      error &&
      'code' in error &&
      error.code === 'auth/user-not-found'
    ) {
      process.stdout.write(
        `No Firebase user exists for ${env.ADMIN_SEED_EMAIL}. Sign in once; the configured email will be promoted automatically.\n`,
      );
      return;
    }
    throw error;
  }
}

try {
  await seedAdmin();
} finally {
  await pool.end();
  if (redis.status !== 'wait' && redis.status !== 'end') redis.disconnect();
}
