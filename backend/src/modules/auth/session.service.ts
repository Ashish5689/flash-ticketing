import { redis } from '../../config/redis.js';
import { env } from '../../config/env.js';

const sessionKey = (jti: string) => `auth:refresh:${jti}`;

export async function storeRefreshSession(jti: string, userId: string) {
  await redis.set(sessionKey(jti), userId, 'EX', env.JWT_REFRESH_TTL_SECONDS);
}

export async function consumeRefreshSession(jti: string) {
  return redis.getdel(sessionKey(jti));
}

export async function revokeRefreshSession(jti: string) {
  await redis.del(sessionKey(jti));
}
