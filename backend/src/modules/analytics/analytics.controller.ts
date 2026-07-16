import type { RequestHandler } from 'express';

import { adminUserQuerySchema, adminUserUpdateSchema, userIdSchema } from './analytics.schemas.js';
import {
  listAdminUsers,
  organizerDashboard,
  platformDashboard,
  updateUserStatus,
} from './analytics.service.js';

export const getOrganizerDashboard: RequestHandler = async (request, response) => {
  response.status(200).json(await organizerDashboard(request.user!.id));
};

export const getPlatformDashboard: RequestHandler = async (_request, response) => {
  response.status(200).json(await platformDashboard());
};

export const getAdminUsers: RequestHandler = async (request, response) => {
  response
    .status(200)
    .json({ users: await listAdminUsers(adminUserQuerySchema.parse(request.query)) });
};

export const patchAdminUser: RequestHandler = async (request, response) => {
  const { id } = userIdSchema.parse(request.params);
  const { status } = adminUserUpdateSchema.parse(request.body);
  response.status(200).json({ user: await updateUserStatus(id, status, request.user!.id) });
};
