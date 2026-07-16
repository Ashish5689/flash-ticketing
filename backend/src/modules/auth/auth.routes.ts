import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.js';
import { requireTrustedOrigin } from '../../middleware/trusted-origin.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import {
  exchangeFirebaseToken,
  getCurrentUser,
  logout,
  refreshAccessToken,
} from './auth.controller.js';

export const authRouter = Router();
const authRateLimit = rateLimit({ namespace: 'auth', limit: 10, windowSeconds: 10 * 60 });

authRouter.post('/firebase', authRateLimit, requireTrustedOrigin, exchangeFirebaseToken);
authRouter.post('/refresh', authRateLimit, requireTrustedOrigin, refreshAccessToken);
authRouter.post('/logout', requireTrustedOrigin, logout);
authRouter.get('/me', requireAuth, getCurrentUser);
