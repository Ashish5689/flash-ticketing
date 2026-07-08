import Stripe from "stripe";
import { env } from "../../config/env";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-02-24.acacia"
});

export async function chargePayment(input: {
  amountCents: number;
  paymentMethodId: string;
  idempotencyKey: string;
}) {
  if (env.NODE_ENV === "test" || env.STRIPE_SECRET_KEY === "sk_test_replace_me") {
    return { providerRef: `test_${input.idempotencyKey}`, status: "succeeded" as const };
  }

  const intent = await stripe.paymentIntents.create(
    {
      amount: input.amountCents,
      currency: "usd",
      payment_method: input.paymentMethodId,
      confirm: true,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: "never"
      }
    },
    { idempotencyKey: input.idempotencyKey }
  );

  return {
    providerRef: intent.id,
    status: intent.status === "succeeded" ? ("succeeded" as const) : ("failed" as const)
  };
}

export async function createPaymentIntent(input: {
  amountCents: number;
  holdId: string;
}) {
  if (env.NODE_ENV === "test" || env.STRIPE_SECRET_KEY === "sk_test_replace_me") {
    return {
      clientSecret: `test_${input.holdId}_secret`,
      paymentIntentId: `test_${input.holdId}`
    };
  }

  const intent = await stripe.paymentIntents.create({
    amount: input.amountCents,
    currency: "usd",
    automatic_payment_methods: {
      enabled: true
    },
    metadata: {
      holdId: input.holdId
    }
  });
  if (!intent.client_secret) throw new Error("Stripe did not return a client secret");

  return {
    clientSecret: intent.client_secret,
    paymentIntentId: intent.id
  };
}

export async function verifyPaymentIntent(input: {
  paymentIntentId: string;
  amountCents: number;
}) {
  if (env.NODE_ENV === "test" || env.STRIPE_SECRET_KEY === "sk_test_replace_me") {
    return { providerRef: input.paymentIntentId, status: "succeeded" as const };
  }

  const intent = await stripe.paymentIntents.retrieve(input.paymentIntentId);
  if (intent.amount !== input.amountCents) return { providerRef: intent.id, status: "failed" as const };

  return {
    providerRef: intent.id,
    status: intent.status === "succeeded" ? ("succeeded" as const) : ("failed" as const)
  };
}
