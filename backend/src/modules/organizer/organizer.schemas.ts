import { z } from 'zod';

export const organizerApplicationSchema = z.object({
  businessName: z.string().trim().min(2).max(180),
  phone: z.string().trim().min(7).max(32),
  documents: z.array(z.url()).max(5).default([]),
});

export const organizerListQuerySchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
});

export const organizerReviewSchema = z.object({
  decision: z.enum(['approve', 'reject']),
  reviewNote: z.string().trim().max(500).optional(),
});
