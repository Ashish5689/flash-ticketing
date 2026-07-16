import { randomUUID } from 'node:crypto';

import { jwtVerify, SignJWT, type JWTPayload } from 'jose';

import { env } from '../../config/env.js';

const encoder = new TextEncoder();
const issuer = 'book-my-show-api';
const audience = 'book-my-show-web';

type AccessTokenInput = {
  id: string;
  email: string;
  role: 'USER' | 'ORGANIZER' | 'ADMIN';
};

export type AccessClaims = JWTPayload & {
  sub: string;
  email: string;
  role: AccessTokenInput['role'];
  type: 'access';
};

export type RefreshClaims = JWTPayload & {
  sub: string;
  jti: string;
  type: 'refresh';
};

function secret(value: string | undefined, name: string) {
  if (!value) throw new Error(`${name} is not configured`);
  return encoder.encode(value);
}

export async function signAccessToken(user: AccessTokenInput) {
  return new SignJWT({ email: user.email, role: user.role, type: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setJti(randomUUID())
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(`${env.JWT_ACCESS_TTL_SECONDS}s`)
    .sign(secret(env.JWT_ACCESS_SECRET, 'JWT_ACCESS_SECRET'));
}

export async function signRefreshToken(userId: string) {
  const jti = randomUUID();
  const token = await new SignJWT({ type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setJti(jti)
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(`${env.JWT_REFRESH_TTL_SECONDS}s`)
    .sign(secret(env.JWT_REFRESH_SECRET, 'JWT_REFRESH_SECRET'));
  return { token, jti };
}

export async function verifyAccessToken(token: string): Promise<AccessClaims> {
  const { payload } = await jwtVerify(token, secret(env.JWT_ACCESS_SECRET, 'JWT_ACCESS_SECRET'), {
    issuer,
    audience,
  });
  if (
    payload.type !== 'access' ||
    typeof payload.sub !== 'string' ||
    typeof payload.email !== 'string' ||
    !['USER', 'ORGANIZER', 'ADMIN'].includes(String(payload.role))
  ) {
    throw new Error('Invalid access token claims');
  }
  return payload as AccessClaims;
}

export async function verifyRefreshToken(token: string): Promise<RefreshClaims> {
  const { payload } = await jwtVerify(token, secret(env.JWT_REFRESH_SECRET, 'JWT_REFRESH_SECRET'), {
    issuer,
    audience,
  });
  if (payload.type !== 'refresh' || typeof payload.sub !== 'string' || !payload.jti) {
    throw new Error('Invalid refresh token claims');
  }
  return payload as RefreshClaims;
}
