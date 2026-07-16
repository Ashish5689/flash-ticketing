import Stripe from 'stripe';

import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors.js';
import { getSeatHold } from './booking.service.js';

let stripeClient: Stripe | undefined;

export function stripeConfigured() {
  return Boolean(env.STRIPE_SECRET_KEY);
}

function stripe() {
  if (!env.STRIPE_SECRET_KEY) {
    throw new AppError(
      503,
      'STRIPE_NOT_CONFIGURED',
      'Stripe test mode is not configured. Add STRIPE_SECRET_KEY to the backend environment.',
    );
  }
  stripeClient ??= new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2026-06-24.dahlia' });
  return stripeClient;
}

export async function createStripeCheckoutSession(
  holdId: string,
  user: { id: string; email: string },
  idempotencyKey: string,
) {
  const hold = await getSeatHold(holdId, user.id);
  const session = await stripe().checkout.sessions.create(
    {
      mode: 'payment',
      customer_email: user.email,
      client_reference_id: holdId,
      line_items: hold.seats.map((seat) => ({
        quantity: 1,
        price_data: {
          currency: 'inr',
          unit_amount: seat.priceCents,
          product_data: {
            name: `${hold.show?.movie.title ?? 'Movie ticket'} — Seat ${seat.label}`,
            description: `${hold.show?.theater.name ?? 'Cinema'} · ${seat.tier}`,
          },
        },
      })),
      metadata: { holdId, userId: user.id, idempotencyKey },
      payment_intent_data: { metadata: { holdId, userId: user.id, idempotencyKey } },
      success_url: `${env.CORS_ORIGIN}/checkout/${holdId}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.CORS_ORIGIN}/checkout/${holdId}?payment=cancelled`,
    },
    { idempotencyKey: `checkout-${idempotencyKey}` },
  );
  if (!session.url) {
    throw new AppError(502, 'STRIPE_SESSION_FAILED', 'Stripe checkout did not return a URL');
  }
  return { id: session.id, url: session.url };
}

export async function verifyStripeCheckoutSession(sessionId: string, userId: string) {
  const session = await stripe().checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== 'paid') {
    throw new AppError(402, 'PAYMENT_NOT_COMPLETED', 'Stripe payment has not completed');
  }
  if (
    !session.metadata?.holdId ||
    !session.metadata.idempotencyKey ||
    session.metadata.userId !== userId
  ) {
    throw new AppError(
      409,
      'STRIPE_SESSION_MISMATCH',
      'Stripe checkout does not match this booking',
    );
  }
  return {
    holdId: session.metadata.holdId,
    idempotencyKey: session.metadata.idempotencyKey,
    payment: { provider: 'stripe', providerRef: session.id } as const,
  };
}
