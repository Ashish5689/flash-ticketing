import type { CookieOptions, RequestHandler } from 'express';
import { z } from 'zod';

import { env } from '../../config/env.js';
import { firebaseAuth } from '../../config/firebase.js';
import { AppError } from '../../shared/errors.js';
import {
  consumeRefreshSession,
  revokeRefreshSession,
  storeRefreshSession,
} from './session.service.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from './token.service.js';
import { toPublicUser } from './auth.types.js';
import { findUserById, upsertIdentity } from './user.service.js';

const exchangeSchema = z.object({ idToken: z.string().min(1) });

const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
  path: '/auth',
  maxAge: env.JWT_REFRESH_TTL_SECONDS * 1000,
};

async function createSession(user: NonNullable<Awaited<ReturnType<typeof findUserById>>>) {
  const [accessToken, refresh] = await Promise.all([
    signAccessToken(user),
    signRefreshToken(user.id),
  ]);
  await storeRefreshSession(refresh.jti, user.id);
  return { accessToken, refreshToken: refresh.token };
}

function assertActive(user: NonNullable<Awaited<ReturnType<typeof findUserById>>>) {
  if (user.status === 'suspended') {
    throw new AppError(403, 'ACCOUNT_SUSPENDED', 'This account has been suspended');
  }
}

export const exchangeFirebaseToken: RequestHandler = async (request, response) => {
  const { idToken } = exchangeSchema.parse(request.body);

  let decoded;
  try {
    decoded = await firebaseAuth.verifyIdToken(idToken, true);
  } catch {
    throw new AppError(401, 'INVALID_FIREBASE_TOKEN', 'Firebase identity token is invalid');
  }

  if (!decoded.email) {
    throw new AppError(400, 'EMAIL_REQUIRED', 'The Firebase account must have an email address');
  }

  const signInProvider = decoded.firebase.sign_in_provider;
  if (signInProvider !== 'google.com' && signInProvider !== 'password') {
    throw new AppError(
      400,
      'UNSUPPORTED_AUTH_PROVIDER',
      'Use Google or email and password to sign in',
    );
  }
  const provider = signInProvider === 'google.com' ? 'google' : 'password';
  const user = await upsertIdentity({
    firebaseUid: decoded.uid,
    email: decoded.email,
    name: decoded.name?.trim() || decoded.email.split('@')[0] || 'Book My Show user',
    avatarUrl: decoded.picture,
    provider,
  });
  assertActive(user);

  const session = await createSession(user);
  response.cookie(env.REFRESH_COOKIE_NAME, session.refreshToken, refreshCookieOptions);
  response.status(200).json({ accessToken: session.accessToken, user: toPublicUser(user) });
};

export const refreshAccessToken: RequestHandler = async (request, response) => {
  const refreshToken = request.cookies[env.REFRESH_COOKIE_NAME] as string | undefined;
  if (!refreshToken) {
    throw new AppError(401, 'REFRESH_REQUIRED', 'Refresh session is missing');
  }

  let claims;
  try {
    claims = await verifyRefreshToken(refreshToken);
  } catch {
    response.clearCookie(env.REFRESH_COOKIE_NAME, refreshCookieOptions);
    throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Refresh session is invalid or expired');
  }

  const sessionUserId = await consumeRefreshSession(claims.jti);
  if (sessionUserId !== claims.sub) {
    response.clearCookie(env.REFRESH_COOKIE_NAME, refreshCookieOptions);
    throw new AppError(401, 'REFRESH_REUSED', 'Refresh session has already been used or revoked');
  }

  const user = await findUserById(claims.sub);
  if (!user) {
    response.clearCookie(env.REFRESH_COOKIE_NAME, refreshCookieOptions);
    throw new AppError(401, 'USER_NOT_FOUND', 'Authenticated user no longer exists');
  }
  if (user.status === 'suspended') {
    response.clearCookie(env.REFRESH_COOKIE_NAME, refreshCookieOptions);
  }
  assertActive(user);

  const session = await createSession(user);
  response.cookie(env.REFRESH_COOKIE_NAME, session.refreshToken, refreshCookieOptions);
  response.status(200).json({ accessToken: session.accessToken, user: toPublicUser(user) });
};

export const logout: RequestHandler = async (request, response) => {
  const refreshToken = request.cookies[env.REFRESH_COOKIE_NAME] as string | undefined;
  if (refreshToken) {
    try {
      const claims = await verifyRefreshToken(refreshToken);
      await revokeRefreshSession(claims.jti);
    } catch {
      // An invalid or expired cookie is still cleared below.
    }
  }
  response.clearCookie(env.REFRESH_COOKIE_NAME, refreshCookieOptions);
  response.status(204).send();
};

export const getCurrentUser: RequestHandler = async (request, response) => {
  const user = request.user ? await findUserById(request.user.id) : undefined;
  if (!user) throw new AppError(401, 'USER_NOT_FOUND', 'Authenticated user no longer exists');
  assertActive(user);
  response.status(200).json({ user: toPublicUser(user) });
};
