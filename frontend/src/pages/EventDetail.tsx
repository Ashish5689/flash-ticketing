import { Armchair, CalendarClock, MapPin, RefreshCcw, Timer } from "lucide-react";
import type { EventDetail as EventDetailType, EventSeat } from "../api/client";

export function EventDetail({
  event,
  selectedSeat,
  queue,
  onSeat,
  onJoinQueue,
  onRefresh,
  onReserve
}: {
  event: EventDetailType;
  selectedSeat: EventSeat | null;
  queue: { token: string; position: number | null; admitted: boolean } | null;
  onSeat: (seat: EventSeat) => void;
  onJoinQueue: () => void;
  onRefresh: () => void;
  onReserve: () => void;
}) {
  return (
    <section className="content split">
      <div>
        <div className="event-detail-banner">
          <div>
            <span className="pill">Flash sale</span>
            <h2>{event.name}</h2>
            <p><MapPin size={15} /> {event.venue}</p>
            <p><CalendarClock size={15} /> {new Date(event.startsAt).toLocaleString()}</p>
          </div>
          <button className="icon-button" onClick={onRefresh} title="Refresh availability"><RefreshCcw size={18} /></button>
        </div>
        <div className="screen-label">Stage / Screen</div>
        <div className="seat-legend">
          <span><i className="available" /> Available</span>
          <span><i className="held" /> Held</span>
          <span><i className="sold" /> Sold</span>
          <span><i className="selected" /> Selected</span>
        </div>
        <div className="seat-map" aria-label="Seat map">
          {event.seats.map((seat) => (
            <button
              key={seat.id}
              className={`seat ${seat.liveStatus} ${selectedSeat?.id === seat.id ? "selected" : ""}`}
              disabled={seat.liveStatus !== "available"}
              onClick={() => onSeat(seat)}
              title={`${seat.seatLabel} ${seat.liveStatus}`}
            >
              <Armchair size={16} />
              <span>{seat.seatLabel}</span>
            </button>
          ))}
        </div>
      </div>
      <aside className="side-panel">
        <h3>Checkout path</h3>
        <p className="muted">Join the sale, wait for admission, then reserve one available seat.</p>
        <div className="live-counts">
          <span><strong>{event.availableCount}</strong> Available</span>
          <span><strong>{event.heldCount}</strong> Held</span>
          <span><strong>{event.soldCount}</strong> Sold</span>
        </div>
        <div className="queue-box">
          <Timer size={18} />
          {queue ? (
            <span>{queue.admitted ? "Admitted" : `Position ${queue.position ?? "..."}`}</span>
          ) : (
            <span>Not in queue</span>
          )}
        </div>
        <button className="secondary full" onClick={onJoinQueue}>Join waiting room</button>
        <button className="primary full" disabled={!queue?.admitted || !selectedSeat} onClick={onReserve}>
          Reserve {selectedSeat ? selectedSeat.seatLabel : "seat"}
        </button>
        {selectedSeat && <p className="muted">{selectedSeat.ticketTypeName} · ${(selectedSeat.priceCents / 100).toFixed(2)}</p>}
      </aside>
    </section>
  );
}
