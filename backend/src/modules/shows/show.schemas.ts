import { z } from 'zod';

export const showPricingInputSchema = z.object({
  tier: z.enum(['CLASSIC', 'PRIME', 'RECLINER']),
  priceCents: z.number().int().min(100).max(100_000),
});

export const showInputSchema = z
  .object({
    movieId: z.uuid(),
    screenId: z.uuid(),
    startsAt: z.iso.datetime({ offset: true }),
    pricing: z.array(showPricingInputSchema).min(1).max(3),
  })
  .superRefine((input, context) => {
    const tiers = new Set(input.pricing.map((price) => price.tier));
    if (tiers.size !== input.pricing.length) {
      context.addIssue({
        code: 'custom',
        message: 'Each tier can be priced only once',
        path: ['pricing'],
      });
    }
  });

export const showtimeQuerySchema = z.object({
  city: z.string().trim().min(2).max(120).default('Mumbai'),
  date: z.iso.date().optional(),
});

export const showDateQuerySchema = z.object({
  city: z.string().trim().min(2).max(120).default('Mumbai'),
  from: z.iso.date().optional(),
  days: z.coerce.number().int().min(1).max(14).default(7),
});

export const organizerShowQuerySchema = z.object({
  status: z.enum(['scheduled', 'onsale', 'closed', 'cancelled']).optional(),
});

export const showStatusUpdateSchema = z.object({
  status: z.literal('cancelled'),
});
