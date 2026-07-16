import type { RequestHandler } from 'express';

import {
  checkoutSessionSchema,
  confirmBookingSchema,
  holdIdSchema,
  holdInputSchema,
  idempotencyHeaderSchema,
  orderIdSchema,
} from './booking.schemas.js';
import {
  confirmBooking,
  createSeatHold,
  getBooking,
  getSeatHold,
  listBookings,
  releaseSeatHold,
} from './booking.service.js';
import { AppError } from '../../shared/errors.js';
import {
  createStripeCheckoutSession,
  stripeConfigured,
  verifyStripeCheckoutSession,
} from './stripe.service.js';

export const createHold: RequestHandler = async (request, response) => {
  const hold = await createSeatHold(request.user!.id, holdInputSchema.parse(request.body));
  response.status(201).json({ hold });
};

export const readHold: RequestHandler = async (request, response) => {
  const { holdId } = holdIdSchema.parse(request.params);
  response.status(200).json({ hold: await getSeatHold(holdId, request.user!.id) });
};

export const deleteHold: RequestHandler = async (request, response) => {
  const { holdId } = holdIdSchema.parse(request.params);
  await releaseSeatHold(holdId, request.user!.id);
  response.status(204).send();
};

export const createCheckoutSession: RequestHandler = async (request, response) => {
  const input = checkoutSessionSchema.parse(request.body);
  const rawKey = request.header('idempotency-key') ?? input.idempotencyKey;
  if (!rawKey) {
    throw new AppError(400, 'IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key header is required');
  }
  const idempotencyKey = idempotencyHeaderSchema.parse(rawKey);
  const session = await createStripeCheckoutSession(input.holdId, request.user!, idempotencyKey);
  response.status(201).json({ session });
};

export const confirmHold: RequestHandler = async (request, response) => {
  const { checkoutSessionId } = confirmBookingSchema.parse(request.body);
  const verified = await verifyStripeCheckoutSession(checkoutSessionId, request.user!.id);
  const booking = await confirmBooking(request.user!.id, verified.idempotencyKey, verified);
  response.status(200).json({ booking });
};

export const getPaymentConfiguration: RequestHandler = async (_request, response) => {
  response.status(200).json({ provider: 'stripe', configured: stripeConfigured() });
};

export const readBookings: RequestHandler = async (request, response) => {
  response.status(200).json({ bookings: await listBookings(request.user!.id) });
};

export const readBooking: RequestHandler = async (request, response) => {
  const { orderId } = orderIdSchema.parse(request.params);
  response.status(200).json({ booking: await getBooking(orderId, request.user!.id) });
};
