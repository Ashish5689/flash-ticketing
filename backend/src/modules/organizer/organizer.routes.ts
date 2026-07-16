import { Router } from 'express';

import { requireAuth, requireRole } from '../../middleware/auth.js';
import {
  applyAsOrganizer,
  getMyOrganizerApplication,
  listAdminOrganizerApplications,
  reviewAdminOrganizerApplication,
} from './organizer.controller.js';

export const organizerApplicationRouter = Router();
organizerApplicationRouter.get('/application', requireAuth, getMyOrganizerApplication);
organizerApplicationRouter.post('/apply', requireAuth, applyAsOrganizer);

export const adminOrganizerRouter = Router();
adminOrganizerRouter.use(requireAuth, requireRole('ADMIN'));
adminOrganizerRouter.get('/', listAdminOrganizerApplications);
adminOrganizerRouter.patch('/:id', reviewAdminOrganizerApplication);
