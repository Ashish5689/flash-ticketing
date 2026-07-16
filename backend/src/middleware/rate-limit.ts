import type { RequestHandler } from 'express';

import { redis } from '../config/redis.js';
import { AppError } from '../shared/errors.js';

const fixedWindowScript = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
local ttl = redis.call('TTL', KEYS[1])
return {count, ttl}
`;

export type RateLimitOptions = {
  namespace: string;
  limit: number;
  windowSeconds: number;
  identity?: 'ip' | 'user';
};

export function rateLimitKey(options: RateLimitOptions, identity: string) {
  return `ratelimit:${options.namespace}:${identity}`;
}

export async function consumeRateLimit(options: RateLimitOptions, identity: string) {
  const [count, ttl] = (await redis.eval(
    fixedWindowScript,
    1,
    rateLimitKey(options, identity),
    String(options.windowSeconds),
  )) as [number, number];
  return {
    allowed: Number(count) <= options.limit,
    remaining: Math.max(0, options.limit - Number(count)),
    retryAfterSeconds: Math.max(1, Number(ttl)),
  };
}

export function rateLimit(options: RateLimitOptions): RequestHandler {
  return async (request, response, next) => {
    const identity =
      options.identity === 'user' ? request.user?.id : request.ip || request.socket.remoteAddress;
    if (!identity) {
      next(new AppError(400, 'RATE_LIMIT_IDENTITY_MISSING', 'Request identity is unavailable'));
      return;
    }
    const result = await consumeRateLimit(options, identity);
    response.setHeader('x-ratelimit-limit', options.limit);
    response.setHeader('x-ratelimit-remaining', result.remaining);
    if (!result.allowed) {
      response.setHeader('retry-after', result.retryAfterSeconds);
      next(
        new AppError(429, 'RATE_LIMITED', 'Too many requests. Please try again shortly.', {
          retryAfterSeconds: result.retryAfterSeconds,
        }),
      );
      return;
    }
    next();
  };
}
