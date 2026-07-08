import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { CreditCard, Loader2 } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useCountdown } from "../hooks/useCountdown";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? "");

export function Checkout({
  hold,
  onCreatePaymentIntent,
  onConfirm
}: {
  hold: { holdId: string; expiresAt: string };
  onCreatePaymentIntent: (holdId: string) => Promise<{ clientSecret: string; paymentIntentId: string }>;
  onConfirm: (paymentIntentId: string) => void;
}) {
  const [intent, setIntent] = useState<{ clientSecret: string; paymentIntentId: string } | null>(null);
  const [error, setError] = useState("");
  const countdown = useCountdown(hold.expiresAt);

  useEffect(() => {
    let cancelled = false;
    setError("");
    setIntent(null);
    onCreatePaymentIntent(hold.holdId)
      .then((created) => {
        if (!cancelled) setIntent(created);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not prepare checkout");
      });
    return () => {
      cancelled = true;
    };
  }, [hold.holdId, onCreatePaymentIntent]);

  const options = useMemo(() => intent && !intent.clientSecret.startsWith("test_")
    ? { clientSecret: intent.clientSecret }
    : undefined, [intent]);

  return (
    <section className="content narrow">
      <p className="eyebrow">Seat held</p>
      <h2>Complete payment before {countdown}</h2>
      <p className="muted">Your seat is temporarily locked. Finish the Stripe test checkout to confirm the ticket.</p>
      {error && <p className="error">{error}</p>}
      {!intent && !error && (
        <div className="checkout-box">
          <Loader2 className="spin" size={20} />
          <span>Preparing secure checkout...</span>
        </div>
      )}
      {intent?.clientSecret.startsWith("test_") && (
        <div className="checkout-box">
          <CreditCard size={20} />
          <div>
            <strong>Stripe test checkout</strong>
            <p className="muted">Using local placeholder mode for automated tests.</p>
          </div>
          <button className="primary" onClick={() => onConfirm(intent.paymentIntentId)}>Confirm booking</button>
        </div>
      )}
      {intent && options && (
        <Elements stripe={stripePromise} options={options}>
          <StripeCheckoutForm onConfirm={onConfirm} />
        </Elements>
      )}
    </section>
  );
}

function StripeCheckoutForm({ onConfirm }: { onConfirm: (paymentIntentId: string) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setError("");
    const result = await stripe.confirmPayment({
      elements,
      redirect: "if_required"
    });
    setBusy(false);
    if (result.error) {
      setError(result.error.message ?? "Payment failed");
      return;
    }
    if (!result.paymentIntent?.id) {
      setError("Payment did not return a confirmation id");
      return;
    }
    onConfirm(result.paymentIntent.id);
  }

  return (
    <form className="stripe-form" onSubmit={submit}>
      <div className="checkout-box stripe-element">
        <CreditCard size={20} />
        <PaymentElement />
      </div>
      {error && <p className="error">{error}</p>}
      <button className="primary full" disabled={!stripe || busy} type="submit">
        {busy ? "Confirming..." : "Pay and confirm ticket"}
      </button>
    </form>
  );
}
