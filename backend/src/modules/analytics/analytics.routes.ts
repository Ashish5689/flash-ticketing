import { Router } from 'express';

import { requireAuth, requireRole } from '../../middleware/auth.js';
import {
  getAdminUsers,
  getOrganizerDashboard,
  getPlatformDashboard,
  patchAdminUser,
} from './analytics.controller.js';

export const organizerAnalyticsRouter = Router();
organizerAnalyticsRouter.use(requireAuth, requireRole('ORGANIZER'));
organizerAnalyticsRouter.get('/stats', getOrganizerDashboard);

export const adminAnalyticsRouter = Router();
adminAnalyticsRouter.use(requireAuth, requireRole('ADMIN'));
adminAnalyticsRouter.get('/stats', getPlatformDashboard);
adminAnalyticsRouter.get('/users', getAdminUsers);
adminAnalyticsRouter.patch('/users/:id', patchAdminUser);
