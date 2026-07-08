import { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { api, type EventDetail as EventDetailType, type EventSeat, type EventSummary } from "./api/client";
import { Header } from "./components/Header";
import { useAuth } from "./hooks/useAuth";
import { useWebSocket } from "./hooks/useWebSocket";
import { AuthPage } from "./pages/AuthPage";
import { EventList } from "./pages/EventList";
import { EventDetail } from "./pages/EventDetail";
import { Checkout } from "./pages/Checkout";
import { Confirmation } from "./pages/Confirmation";
import { OrganizerDashboard } from "./pages/OrganizerDashboard";

type View = "events" | "detail" | "checkout" | "confirmed" | "organizer";

export function App() {
  const { token, user, loading } = useAuth();
  const messages = useWebSocket(token);
  const [view, setView] = useState<View>("events");
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [event, setEvent] = useState<EventDetailType | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<EventSeat | null>(null);
  const [queue, setQueue] = useState<{ token: string; position: number | null; admitted: boolean } | null>(null);
  const [hold, setHold] = useState<{ holdId: string; expiresAt: string } | null>(null);
  const [confirmation, setConfirmation] = useState<{ orderId: string; ticketCode: string } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    if (window.location.hash === "#organizer" && user.role === "organizer") {
      setView("organizer");
      window.history.replaceState({}, "", "/");
      return;
    }
    if (window.location.hash === "#events") {
      setView("events");
      window.history.replaceState({}, "", "/");
      return;
    }
    setView(user.role === "organizer" ? "organizer" : "events");
  }, [user?.id, user?.role]);

  async function loadEvents() {
    setEvents(await api.events());
  }

  async function loadEvent(id: string) {
    const detail = await api.event(id);
    setEvent(detail);
    setSelectedSeat(null);
    setView("detail");
  }

  useEffect(() => {
    if (token) loadEvents().catch((err) => setError(err.message));
  }, [token]);

  useEffect(() => {
    if (!queue || !event || queue.admitted || !token) return;
    const id = setInterval(async () => {
      const status = await api.queueStatus(token, event.id, queue.token);
      setQueue(status);
    }, 2500);
    return () => clearInterval(id);
  }, [queue, event, token]);

  useEffect(() => {
    const admitted = messages.find((message) => message.type === "queue.admitted") as { token?: string } | undefined;
    if (admitted?.token && queue?.token === admitted.token) setQueue({ ...queue, admitted: true, position: 0 });
  }, [messages, queue]);

  if (loading) {
    return (
      <main className="loading-screen">
        <Loader2 className="spin" size={30} />
        <span>Loading your ticketing session...</span>
      </main>
    );
  }

  if (!token || !user) return <AuthPage />;

  async function guarded(action: () => Promise<void>) {
    setError("");
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <>
      <Header onHome={() => guarded(async () => { await loadEvents(); setView("events"); })} />
      {error && <div className="toast"><AlertTriangle size={16} /> {error}</div>}
      {view === "events" && (
        <EventList
          events={events}
          onSelect={(id) => guarded(() => loadEvent(id))}
          onCreate={() => setView(user.role === "organizer" ? "organizer" : "events")}
        />
      )}
      {view === "organizer" && (
        <OrganizerDashboard
          onCreate={(input) =>
            guarded(async () => {
              const created = await api.createEvent(token, {
                name: input.name,
                venue: input.venue,
                startsAt: input.startsAt,
                status: input.status
              });
              await api.addSeats(token, created.id, {
                ticketTypeName: "Standard",
                priceCents: 4999,
                seatLabels: input.seats.split(",").map((seat) => seat.trim()).filter(Boolean)
              });
              await loadEvents();
              setView("events");
            })
          }
        />
      )}
      {view === "detail" && event && (
        <EventDetail
          event={event}
          selectedSeat={selectedSeat}
          queue={queue}
          onSeat={setSelectedSeat}
          onRefresh={() => guarded(() => loadEvent(event.id))}
          onJoinQueue={() =>
            guarded(async () => {
              const joined = await api.joinQueue(token, event.id);
              setQueue(joined);
            })
          }
          onReserve={() =>
            guarded(async () => {
              if (!selectedSeat || !queue) return;
              const reserved = await api.reserve(token, { eventId: event.id, seatId: selectedSeat.id, token: queue.token });
              setHold(reserved);
              setView("checkout");
            })
          }
        />
      )}
      {view === "checkout" && hold && (
        <Checkout
          hold={hold}
          onConfirm={(paymentMethodId) =>
            guarded(async () => {
              const result = await api.confirm(token, { holdId: hold.holdId, paymentMethodId });
              setConfirmation({ orderId: result.orderId, ticketCode: result.ticket.code });
              setView("confirmed");
            })
          }
        />
      )}
      {view === "confirmed" && confirmation && (
        <Confirmation
          orderId={confirmation.orderId}
          ticketCode={confirmation.ticketCode}
          onDone={() => guarded(async () => { await loadEvents(); setView("events"); })}
        />
      )}
    </>
  );
}
