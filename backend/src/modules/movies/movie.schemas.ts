import { z } from 'zod';

const assetLocationSchema = z
  .string()
  .min(1)
  .max(2048)
  .refine(
    (value) => value.startsWith('/') || z.url().safeParse(value).success,
    'Use an absolute URL or a root-relative asset path',
  );

const managedAssetKeySchema = z
  .string()
  .regex(/^movies\/(posters|banners)\/[0-9a-f-]+\.webp$/, 'Use a managed movie media asset key');

export const movieInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(20).max(5000),
  posterUrl: assetLocationSchema,
  posterAssetKey: managedAssetKeySchema.nullish(),
  bannerUrl: assetLocationSchema.nullish(),
  bannerAssetKey: managedAssetKeySchema.nullish(),
  genres: z.array(z.string().trim().min(1).max(40)).min(1).max(8),
  languages: z.array(z.string().trim().min(1).max(40)).min(1).max(8),
  durationMin: z.number().int().min(1).max(600),
  certificate: z.string().trim().min(1).max(16),
  rating: z.number().min(0).max(10),
  releaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
});

export const movieUpdateSchema = movieInputSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update');

export const movieListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  genre: z.string().trim().max(40).optional(),
  language: z.string().trim().max(40).optional(),
  city: z.string().trim().max(120).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
});
