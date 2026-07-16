import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import {
  confirmHold,
  createCheckoutSession,
  createHold,
  deleteHold,
  getPaymentConfiguration,
  readBooking,
  readBookings,
  readHold,
} from './booking.controller.js';

export const bookingRouter = Router();
bookingRouter.use(requireAuth);
const bookingMutationLimit = rateLimit({
  namespace: 'booking',
  limit: 30,
  windowSeconds: 60,
  identity: 'user',
});
bookingRouter.post('/hold', bookingMutationLimit, createHold);
bookingRouter.get('/payment-config', getPaymentConfiguration);
bookingRouter.post('/checkout-session', bookingMutationLimit, createCheckoutSession);
bookingRouter.get('/hold/:holdId', readHold);
bookingRouter.delete('/hold/:holdId', bookingMutationLimit, deleteHold);
bookingRouter.post('/confirm', bookingMutationLimit, confirmHold);
bookingRouter.get('/', readBookings);
bookingRouter.get('/:orderId', readBooking);
