import type { NextFunction, Response } from "express";
import { redis } from "../config/redis";
import type { AuthedRequest } from "../types";
import { AppError } from "../shared/errors";

export function rateLimit(limit: number, windowSeconds: number) {
  return async (req: AuthedRequest, _res: Response, next: NextFunction) => {
    const key = `ratelimit:${req.user?.id ?? req.ip}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, windowSeconds);
    if (count > limit) throw new AppError(429, "Too many requests", "RATE_LIMITED");
    next();
  };
}
