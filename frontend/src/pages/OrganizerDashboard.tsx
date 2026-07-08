import { useState } from "react";
import { Activity, CalendarClock, MapPin, Radio, TicketCheck } from "lucide-react";
import type { EventSummary } from "../api/client";

export function OrganizerDashboard({
  events,
  liveConnected,
  onCreate
}: {
  events: EventSummary[];
  liveConnected: boolean;
  onCreate: (input: { name: string; venue: string; startsAt: string; status: string; seats: string }) => void;
}) {
  const [name, setName] = useState("Flash Drop");
  const [venue, setVenue] = useState("City Arena");
  const [startsAt, setStartsAt] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 16));
  const [seats, setSeats] = useState("A1,A2,A3,A4,B1,B2,B3,B4");
  const totals = events.reduce(
    (acc, event) => {
      acc.total += event.totalSeats;
      acc.sold += event.soldCount;
      acc.held += event.heldCount;
      return acc;
    },
    { total: 0, sold: 0, held: 0 }
  );
  const available = Math.max(0, totals.total - totals.sold - totals.held);

  return (
    <section className="content organizer-layout">
      <div className="organizer-main">
        <div className="section-head organizer-head">
          <div>
            <p className="eyebrow">Organizer studio</p>
            <h2>Live sales dashboard</h2>
          </div>
          <span className={`live-pill ${liveConnected ? "online" : ""}`}>
            <Radio size={15} /> {liveConnected ? "Live" : "Reconnecting"}
          </span>
        </div>
        <div className="metric-grid">
          <div className="metric"><Activity size={18} /><strong>{available}</strong><span>Available</span></div>
          <div className="metric"><TicketCheck size={18} /><strong>{totals.held}</strong><span>Held</span></div>
          <div className="metric"><TicketCheck size={18} /><strong>{totals.sold}</strong><span>Sold</span></div>
        </div>
        <div className="event-table">
          {events.map((event) => {
            const eventAvailable = Math.max(0, event.totalSeats - event.soldCount - event.heldCount);
            return (
              <article className="event-row" key={event.id}>
                <div>
                  <strong>{event.name}</strong>
                  <span><MapPin size={14} /> {event.venue}</span>
                  <span><CalendarClock size={14} /> {new Date(event.startsAt).toLocaleString()}</span>
                </div>
                <div className="event-row-stats">
                  <span>{eventAvailable} available</span>
                  <span>{event.heldCount} held</span>
                  <span>{event.soldCount} sold</span>
                </div>
              </article>
            );
          })}
          {!events.length && <p className="muted">Create an event to start tracking live inventory.</p>}
        </div>
      </div>
      <aside className="create-panel">
        <p className="eyebrow">Create</p>
        <h3>Create event inventory</h3>
        <p className="muted">Publish an onsale event and attach a compact seat map in one go.</p>
        <form
          className="form"
          onSubmit={(event) => {
            event.preventDefault();
            onCreate({ name, venue, startsAt: new Date(startsAt).toISOString(), status: "onsale", seats });
          }}
        >
          <label>Name<input value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label>Venue<input value={venue} onChange={(e) => setVenue(e.target.value)} /></label>
          <label>Starts at<input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} /></label>
          <label>Seat labels<input value={seats} onChange={(e) => setSeats(e.target.value)} /></label>
          <button className="primary" type="submit">Create onsale event</button>
        </form>
      </aside>
    </section>
  );
}
