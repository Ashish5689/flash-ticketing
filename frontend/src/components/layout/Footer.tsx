import { Link } from 'react-router-dom';

import { BrandMark } from './BrandMark';

export function Footer() {
  return (
    <footer className="border-t border-brand-contrast/10 bg-surface-dark text-brand-contrast">
      <div className="mx-auto flex max-w-content flex-col gap-6 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div>
          <BrandMark className="text-brand-contrast" />
          <p className="mt-3 text-xs text-brand-contrast/60">© 2026 Flash Ticketing</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-7 gap-y-3">
          <Link
            className="text-sm text-brand-contrast/70 hover:text-brand-contrast"
            to="/movies?contentType=movie"
          >
            Movies
          </Link>
          <Link
            className="text-sm text-brand-contrast/70 hover:text-brand-contrast"
            to="/movies?contentType=event"
          >
            Events
          </Link>
          <Link className="text-sm text-brand-contrast/70 hover:text-brand-contrast" to="/bookings">
            My bookings
          </Link>
        </nav>
      </div>
    </footer>
  );
}
