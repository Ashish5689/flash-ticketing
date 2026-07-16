import { z } from 'zod';

const seatLabelSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{1,4}[1-9][0-9]?$/);

export const holdInputSchema = z.object({
  showId: z.uuid(),
  seats: z
    .array(seatLabelSchema)
    .min(1)
    .max(10)
    .refine((labels) => new Set(labels).size === labels.length, 'Seat labels must be unique'),
});

export const checkoutSessionSchema = z.object({
  holdId: z.uuid(),
  idempotencyKey: z.uuid().optional(),
});

export const confirmBookingSchema = z.object({ checkoutSessionId: z.string().startsWith('cs_') });

export const holdIdSchema = z.object({ holdId: z.uuid() });
export const orderIdSchema = z.object({ orderId: z.uuid() });
export const idempotencyHeaderSchema = z.uuid();

export type HoldInput = z.infer<typeof holdInputSchema>;
