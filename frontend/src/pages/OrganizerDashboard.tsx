import { useState } from "react";

export function OrganizerDashboard({
  onCreate
}: {
  onCreate: (input: { name: string; venue: string; startsAt: string; status: string; seats: string }) => void;
}) {
  const [name, setName] = useState("Flash Drop");
  const [venue, setVenue] = useState("City Arena");
  const [startsAt, setStartsAt] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 16));
  const [seats, setSeats] = useState("A1,A2,A3,A4,B1,B2,B3,B4");

  return (
    <section className="content narrow">
      <p className="eyebrow">Organizer studio</p>
      <h2>Create event inventory</h2>
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
    </section>
  );
}
