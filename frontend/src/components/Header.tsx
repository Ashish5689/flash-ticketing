import { Film, LogOut, MapPin, Search, Ticket } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

export function Header({ onHome }: { onHome: () => void }) {
  const { user, logout } = useAuth();
  return (
    <header className="topbar">
      <div className="topbar-main">
        <button className="brand" onClick={onHome}>
          <Ticket size={22} />
          <span>Flash Ticketing</span>
        </button>
        <div className="search-shell">
          <Search size={17} />
          <span>Search for events, venues, artists</span>
        </div>
      </div>
      <div className="topbar-actions">
        <span className="city-chip"><MapPin size={15} /> Mumbai</span>
        <span className="nav-link"><Film size={15} /> Events</span>
        {user && <span className="user-chip">{user.email} · {user.role}</span>}
        {user && (
          <button className="icon-button" onClick={() => void logout()} title="Log out">
            <LogOut size={18} />
          </button>
        )}
      </div>
    </header>
  );
}
