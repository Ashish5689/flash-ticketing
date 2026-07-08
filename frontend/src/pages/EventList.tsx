import { CalendarClock, Flame, MapPin, Plus, Search, SlidersHorizontal, TicketCheck } from "lucide-react";
import { useMemo, useState } from "react";
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
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const categories = ["All", "Concerts", "Sports", "Comedy", "Theatre"];
  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return events.filter((event) => {
      const haystack = `${event.name} ${event.venue}`.toLowerCase();
      const matchesSearch = !query || haystack.includes(query);
      const matchesCategory = category === "All" || inferCategory(event) === category;
      return matchesSearch && matchesCategory;
    });
  }, [category, events, search]);

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
      <div className="discovery-controls">
        <label className="event-search">
          <Search size={18} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search events or venues" />
        </label>
        <span className="filter-chip"><SlidersHorizontal size={16} /> Live inventory</span>
      </div>
      <div className="category-rail">
        {categories.map((item) => (
          <button key={item} className={`category ${category === item ? "active" : ""}`} onClick={() => setCategory(item)}>
            {item}
          </button>
        ))}
      </div>
      <div className="section-head">
        <div>
          <p className="eyebrow">Book now</p>
          <h2>Recommended events</h2>
        </div>
      </div>
      <div className="event-grid">
        {filteredEvents.map((event) => {
          const available = Math.max(0, event.totalSeats - event.soldCount - event.heldCount);
          const soldPercent = event.totalSeats ? (event.soldCount / event.totalSeats) * 100 : 0;
          return (
            <button className="event-card" key={event.id} onClick={() => onSelect(event.id)}>
              <div className="poster">
                <span className={`status ${event.status}`}>{event.status}</span>
                <span className="date-chip">{formatDate(event.startsAt)}</span>
                <TicketCheck size={34} />
              </div>
              <div className="availability-badge">{available > 0 ? `${available} seats left` : "Sold out"}</div>
              <h3>{event.name}</h3>
              <p><MapPin size={15} /> {event.venue}</p>
              <p><CalendarClock size={15} /> {new Date(event.startsAt).toLocaleString()}</p>
              <div className="meter">
                <span style={{ width: `${soldPercent}%` }} />
              </div>
              <div className="stat-row">
                <span>{available} available</span>
                <span>{event.heldCount} held</span>
                <span>{event.soldCount} sold</span>
              </div>
            </button>
          );
        })}
        {!filteredEvents.length && (
          <div className="empty-state">
            <TicketCheck size={28} />
            <strong>No events found</strong>
            <span>Try a different search or category.</span>
          </div>
        )}
      </div>
    </section>
  );
}

function inferCategory(event: EventSummary) {
  const text = `${event.name} ${event.venue}`.toLowerCase();
  if (/(match|ipl|league|stadium|arena|sport)/.test(text)) return "Sports";
  if (/(comedy|standup|stand-up)/.test(text)) return "Comedy";
  if (/(theatre|stage|play|drama)/.test(text)) return "Theatre";
  return "Concerts";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value));
}
