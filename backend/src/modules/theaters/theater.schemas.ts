import { z } from 'zod';

export const theaterInputSchema = z.object({
  name: z.string().trim().min(2).max(180),
  city: z.string().trim().min(2).max(120),
  address: z.string().trim().min(8).max(500),
  status: z.enum(['active', 'inactive']).default('active'),
});

export const theaterUpdateSchema = theaterInputSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update');

const screenLayoutSchema = z
  .object({
    rows: z
      .array(
        z.object({
          label: z.string().trim().min(1).max(4),
          seatCount: z.number().int().min(1).max(40),
          tier: z.enum(['CLASSIC', 'PRIME', 'RECLINER']),
        }),
      )
      .min(1)
      .max(26),
    aisleAfterColumns: z.array(z.number().int().min(1).max(39)).max(10).default([]),
  })
  .superRefine((layout, context) => {
    const rowLabels = new Set(layout.rows.map((row) => row.label.toUpperCase()));
    if (rowLabels.size !== layout.rows.length) {
      context.addIssue({ code: 'custom', message: 'Row labels must be unique', path: ['rows'] });
    }
    const aisles = new Set(layout.aisleAfterColumns);
    if (aisles.size !== layout.aisleAfterColumns.length) {
      context.addIssue({
        code: 'custom',
        message: 'Aisle positions must be unique',
        path: ['aisleAfterColumns'],
      });
    }
  });

export const screenInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  layout: screenLayoutSchema,
});

export const screenUpdateSchema = screenInputSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update');
