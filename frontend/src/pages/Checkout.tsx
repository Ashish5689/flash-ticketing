import { CreditCard } from "lucide-react";
import { useState } from "react";
import { useCountdown } from "../hooks/useCountdown";

export function Checkout({
  hold,
  onConfirm
}: {
  hold: { holdId: string; expiresAt: string };
  onConfirm: (paymentMethodId: string) => void;
}) {
  const [paymentMethodId, setPaymentMethodId] = useState("pm_card_visa");
  const countdown = useCountdown(hold.expiresAt);
  return (
    <section className="content narrow">
      <p className="eyebrow">Seat held</p>
      <h2>Complete payment before {countdown}</h2>
      <p className="muted">Your seat is temporarily locked. Finish the Stripe test checkout to confirm the ticket.</p>
      <div className="checkout-box">
        <CreditCard size={20} />
        <label>Stripe test payment method
          <input value={paymentMethodId} onChange={(e) => setPaymentMethodId(e.target.value)} />
        </label>
      </div>
      <button className="primary" onClick={() => onConfirm(paymentMethodId)}>Confirm booking</button>
    </section>
  );
}
