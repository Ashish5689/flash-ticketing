import { CalendarClock, Flame, MapPin, Plus, TicketCheck } from "lucide-react";
import type { EventSummary } from "../api/client";

export function EventList({
  events,
  onSelect,
  onCreate
}: {
  events: EventSummary[];
  onSelect: (id: string) => void;
  onCreate: () => void;
}) {
  return (
    <section className="content">
      <div className="discovery-hero">
        <div>
          <span className="pill hot"><Flame size={14} /> Trending now</span>
          <h1>Live drops near you</h1>
          <p>Pick your event, join the queue, and lock seats before they disappear.</p>
        </div>
        <button className="hero-action" onClick={onCreate}><Plus size={18} /> Create event</button>
      </div>
      <div className="category-rail">
        <span className="category active">All</span>
        <span className="category">Concerts</span>
        <span className="category">Sports</span>
        <span className="category">Comedy</span>
        <span className="category">Theatre</span>
      </div>
      <div className="section-head">
        <div>
          <p className="eyebrow">Book now</p>
          <h2>Recommended events</h2>
        </div>
      </div>
      <div className="event-grid">
        {events.map((event) => {
          const available = Math.max(0, event.totalSeats - event.soldCount - event.heldCount);
          return (
            <button className="event-card" key={event.id} onClick={() => onSelect(event.id)}>
              <div className="poster">
                <span className={`status ${event.status}`}>{event.status}</span>
                <TicketCheck size={34} />
              </div>
              <h3>{event.name}</h3>
              <p><MapPin size={15} /> {event.venue}</p>
              <p><CalendarClock size={15} /> {new Date(event.startsAt).toLocaleString()}</p>
              <div className="meter">
                <span style={{ width: `${event.totalSeats ? (event.soldCount / event.totalSeats) * 100 : 0}%` }} />
              </div>
              <div className="stat-row">
                <span>{available} available</span>
                <span>{event.heldCount} held</span>
                <span>{event.soldCount} sold</span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
