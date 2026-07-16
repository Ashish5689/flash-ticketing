import type { RequestHandler } from 'express';
import { z } from 'zod';

import { AppError } from '../../shared/errors.js';
import {
  organizerApplicationSchema,
  organizerListQuerySchema,
  organizerReviewSchema,
} from './organizer.schemas.js';
import {
  getApplicationForUser,
  listOrganizerApplications,
  reviewOrganizerApplication,
  submitOrganizerApplication,
} from './organizer.service.js';

const idSchema = z.object({ id: z.uuid() });

export const getMyOrganizerApplication: RequestHandler = async (request, response) => {
  response.status(200).json({ application: await getApplicationForUser(request.user!.id) });
};

export const applyAsOrganizer: RequestHandler = async (request, response) => {
  if (request.user!.role !== 'USER') {
    throw new AppError(409, 'ROLE_NOT_ELIGIBLE', 'Only user accounts can apply as organizers');
  }
  const application = await submitOrganizerApplication(
    request.user!.id,
    organizerApplicationSchema.parse(request.body),
  );
  response.status(201).json({ application });
};

export const listAdminOrganizerApplications: RequestHandler = async (request, response) => {
  const query = organizerListQuerySchema.parse(request.query);
  response.status(200).json({ applications: await listOrganizerApplications(query) });
};

export const reviewAdminOrganizerApplication: RequestHandler = async (request, response) => {
  const { id } = idSchema.parse(request.params);
  const application = await reviewOrganizerApplication(
    id,
    request.user!.id,
    organizerReviewSchema.parse(request.body),
  );
  response.status(200).json({ application });
};
