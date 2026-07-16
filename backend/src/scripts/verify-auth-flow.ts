import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';

import { db, pool } from '../config/db.js';
import { env } from '../config/env.js';
import { firebaseAuth } from '../config/firebase.js';
import { redis } from '../config/redis.js';
import { users } from '../db/schema/users.js';
import { revokeRefreshSession } from '../modules/auth/session.service.js';
import { verifyRefreshToken } from '../modules/auth/token.service.js';

const apiUrl = process.env.AUTH_VERIFY_API_URL ?? 'http://localhost:4000';
const firebaseWebApiKey = process.env.FIREBASE_WEB_API_KEY;
const email = `phase1-${randomUUID()}@example.com`;
const password = `Phase1-${randomUUID()}!`;
const refreshSessionIds = new Set<string>();
let firebaseUid: string | undefined;

if (!firebaseWebApiKey) throw new Error('FIREBASE_WEB_API_KEY is required');

async function json<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as T;
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${JSON.stringify(body)}`);
  return body;
}

function refreshCookie(response: Response) {
  const header = response.headers
    .getSetCookie()
    .find((value) => value.startsWith(`${env.REFRESH_COOKIE_NAME}=`));
  if (!header) throw new Error('Refresh cookie was not returned');
  return header.split(';')[0] ?? '';
}

async function trackRefreshCookie(cookie: string) {
  const token = cookie.slice(cookie.indexOf('=') + 1);
  const claims = await verifyRefreshToken(token);
  refreshSessionIds.add(claims.jti);
}

async function verifyFlow() {
  const firebaseUser = await firebaseAuth.createUser({
    email,
    password,
    displayName: 'Phase One Verification',
    emailVerified: true,
  });
  firebaseUid = firebaseUser.uid;

  const firebaseSession = await json<{ idToken: string }>(
    await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseWebApiKey}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      },
    ),
  );

  const exchangeResponse = await fetch(`${apiUrl}/auth/firebase`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: env.CORS_ORIGIN },
    body: JSON.stringify({ idToken: firebaseSession.idToken }),
  });
  const exchange = await json<{
    accessToken: string;
    user: { id: string; email: string; role: string };
  }>(exchangeResponse);
  if (exchange.user.email !== email || exchange.user.role !== 'USER') {
    throw new Error('Firebase exchange returned an unexpected user');
  }
  const firstCookie = refreshCookie(exchangeResponse);
  await trackRefreshCookie(firstCookie);

  const me = await json<{ user: { id: string; role: string } }>(
    await fetch(`${apiUrl}/auth/me`, {
      headers: { authorization: `Bearer ${exchange.accessToken}` },
    }),
  );
  if (me.user.id !== exchange.user.id || me.user.role !== 'USER') {
    throw new Error('/auth/me did not return the exchanged identity');
  }

  const refreshResponse = await fetch(`${apiUrl}/auth/refresh`, {
    method: 'POST',
    headers: { cookie: firstCookie, origin: env.CORS_ORIGIN },
  });
  const refreshed = await json<{ accessToken: string }>(refreshResponse);
  if (refreshed.accessToken === exchange.accessToken) {
    throw new Error('Refresh did not rotate the access token');
  }
  const secondCookie = refreshCookie(refreshResponse);
  await trackRefreshCookie(secondCookie);

  const reuseResponse = await fetch(`${apiUrl}/auth/refresh`, {
    method: 'POST',
    headers: { cookie: firstCookie, origin: env.CORS_ORIGIN },
  });
  if (reuseResponse.status !== 401) throw new Error('A reused refresh token was accepted');

  const logoutResponse = await fetch(`${apiUrl}/auth/logout`, {
    method: 'POST',
    headers: { cookie: secondCookie, origin: env.CORS_ORIGIN },
  });
  if (logoutResponse.status !== 204) throw new Error('Logout did not complete');

  process.stdout.write(
    'Firebase exchange, /auth/me, refresh rotation, reuse rejection, and logout passed.\n',
  );
}

try {
  await verifyFlow();
} finally {
  await Promise.all([...refreshSessionIds].map((jti) => revokeRefreshSession(jti)));
  if (firebaseUid) {
    await Promise.all([
      firebaseAuth.deleteUser(firebaseUid).catch(() => undefined),
      db.delete(users).where(eq(users.firebaseUid, firebaseUid)),
    ]);
  }
  await pool.end();
  if (redis.status !== 'wait' && redis.status !== 'end') redis.disconnect();
}
