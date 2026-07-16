import type { RequestHandler } from 'express';

import { AppError } from '../shared/errors.js';
import { verifyAccessToken } from '../modules/auth/token.service.js';
import { redis } from '../config/redis.js';

type Role = 'USER' | 'ORGANIZER' | 'ADMIN';

export const requireAuth: RequestHandler = async (request, _response, next) => {
  const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
  if (scheme !== 'Bearer' || !token) {
    next(new AppError(401, 'AUTH_REQUIRED', 'Authentication is required'));
    return;
  }

  try {
    const claims = await verifyAccessToken(token);
    if (await redis.get(`account:suspended:${claims.sub}`)) {
      next(new AppError(403, 'ACCOUNT_SUSPENDED', 'This account has been suspended'));
      return;
    }
    request.user = { id: claims.sub, email: claims.email, role: claims.role };
    next();
  } catch {
    next(new AppError(401, 'INVALID_ACCESS_TOKEN', 'Access token is invalid or expired'));
  }
};

export function requireRole(...roles: Role[]): RequestHandler {
  return (request, _response, next) => {
    if (!request.user) {
      next(new AppError(401, 'AUTH_REQUIRED', 'Authentication is required'));
      return;
    }
    if (!roles.includes(request.user.role)) {
      next(new AppError(403, 'FORBIDDEN', 'You do not have permission to access this resource'));
      return;
    }
    next();
  };
}
