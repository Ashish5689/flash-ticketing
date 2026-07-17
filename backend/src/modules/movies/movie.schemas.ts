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
  contentType: z.enum(['movie', 'event']).default('movie'),
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

const publicMovieListFields = {
  contentType: z.enum(['movie', 'event']).optional(),
  q: z.string().trim().max(100).optional(),
  genre: z.string().trim().max(40).optional(),
  language: z.string().trim().max(40).optional(),
  city: z.string().trim().max(120).optional(),
  dateFrom: z.iso.date().optional(),
  dateTo: z.iso.date().optional(),
};

function validateDateRange(
  query: { dateFrom?: string; dateTo?: string },
  context: z.RefinementCtx,
) {
  if (Boolean(query.dateFrom) !== Boolean(query.dateTo)) {
    context.addIssue({
      code: 'custom',
      message: 'dateFrom and dateTo must be provided together',
      path: [query.dateFrom ? 'dateTo' : 'dateFrom'],
    });
    return;
  }
  if (!query.dateFrom || !query.dateTo) return;
  const start = Date.parse(`${query.dateFrom}T00:00:00Z`);
  const end = Date.parse(`${query.dateTo}T00:00:00Z`);
  const inclusiveDays = Math.floor((end - start) / 86_400_000) + 1;
  if (inclusiveDays < 1 || inclusiveDays > 31) {
    context.addIssue({
      code: 'custom',
      message: 'Use an inclusive date range between 1 and 31 days',
      path: ['dateTo'],
    });
  }
}

export const publicMovieListQuerySchema = z
  .object(publicMovieListFields)
  .superRefine(validateDateRange);

export const movieListQuerySchema = z
  .object({
    ...publicMovieListFields,
    status: z.enum(['draft', 'published', 'archived']).optional(),
  })
  .superRefine(validateDateRange);
