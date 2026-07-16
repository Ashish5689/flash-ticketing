import { z } from 'zod';

export const mediaKindSchema = z.enum(['poster', 'banner']);

export const managedMediaKeySchema = z
  .string()
  .regex(/^movies\/(posters|banners)\/[0-9a-f-]+\.webp$/, 'Use a managed movie media asset key');

export const importImageSchema = z.object({
  sourceUrl: z
    .url()
    .max(2048)
    .refine((value) => new URL(value).protocol === 'https:', 'Use a direct HTTPS image URL'),
  kind: mediaKindSchema,
});

export const deleteImageSchema = z.object({ key: managedMediaKeySchema });
