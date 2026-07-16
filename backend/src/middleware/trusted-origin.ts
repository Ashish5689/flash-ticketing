import type { RequestHandler } from 'express';

import { env } from '../config/env.js';
import { AppError } from '../shared/errors.js';

export const requireTrustedOrigin: RequestHandler = (request, _response, next) => {
  const origin = request.get('origin');
  if (origin !== env.CORS_ORIGIN) {
    next(new AppError(403, 'UNTRUSTED_ORIGIN', 'Request origin is not allowed'));
    return;
  }
  next();
};
