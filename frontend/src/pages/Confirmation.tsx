import { CheckCircle2 } from "lucide-react";

export function Confirmation({ orderId, ticketCode, onDone }: { orderId: string; ticketCode: string; onDone: () => void }) {
  return (
    <section className="content narrow success">
      <CheckCircle2 size={40} />
      <p className="eyebrow">Confirmed</p>
      <h2>Your ticket is locked in.</h2>
      <div className="ticket-code">{ticketCode}</div>
      <p className="muted">Order {orderId}</p>
      <button className="secondary" onClick={onDone}>Back to events</button>
    </section>
  );
}
