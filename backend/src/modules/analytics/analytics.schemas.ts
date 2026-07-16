import { z } from 'zod';

export const adminUserQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  role: z.enum(['USER', 'ORGANIZER', 'ADMIN']).optional(),
  status: z.enum(['active', 'suspended']).optional(),
});

export const adminUserUpdateSchema = z.object({
  status: z.enum(['active', 'suspended']),
});

export const userIdSchema = z.object({ id: z.uuid() });
