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
