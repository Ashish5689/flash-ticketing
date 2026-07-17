import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { logoutSession } from '../../lib/api';
import { cn } from '../../lib/cn';
import { useCatalogStore } from '../../stores/catalogStore';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../ui';
import { BrandMark } from './BrandMark';

type NavbarProps = {
  onCityClick?: () => void;
  management?: boolean;
};

const navigation = [
  { label: 'Movies', to: '/movies?contentType=movie' },
  { label: 'Events', to: '/movies?contentType=event' },
  { label: 'My bookings', to: '/bookings' },
];

export function Navbar({ onCityClick, management = false }: NavbarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const city = useCatalogStore((state) => state.city);
  const [menuOpen, setMenuOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);

  const signOut = async () => {
    const { signOutFirebase } = await import('../../lib/firebase');
    await Promise.allSettled([logoutSession(), signOutFirebase()]);
    clearSession();
    navigate('/');
  };

  return (
    <header className="relative z-40 border-b border-brand-contrast/10 bg-surface-dark text-brand-contrast">
      <div className="mx-auto flex min-h-16 max-w-content items-center justify-between gap-5 px-5 sm:px-8">
        <BrandMark className="text-brand-contrast" />

        {!management ? (
          <nav aria-label="Primary" className="hidden items-center gap-8 lg:flex">
            {navigation.map((item) => {
              const active = navIsActive(item.label, location.pathname, location.search);
              return (
                <Link
                  className={cn(
                    'border-b-2 border-transparent py-5 text-sm font-semibold text-brand-contrast/80 transition duration-fast hover:text-brand-contrast',
                    active && 'border-brand text-brand-contrast',
                  )}
                  key={item.label}
                  to={item.to}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        ) : (
          <div className="hidden flex-1 lg:block" />
        )}

        <div className="hidden items-center gap-2 sm:flex">
          {!management ? (
            <button
              className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-brand-contrast/90 transition hover:bg-brand-contrast/10"
              onClick={onCityClick}
              type="button"
            >
              <LocationIcon />
              {city}
              <ChevronDownIcon />
            </button>
          ) : null}
          {user ? (
            <>
              <Button
                className="border-brand-contrast/30 bg-transparent text-brand-contrast hover:bg-brand-contrast/10"
                onClick={() => navigate(user.role === 'ADMIN' ? '/admin' : '/account')}
                size="sm"
                variant="outline"
              >
                {user.name.split(' ')[0]}
              </Button>
              <Button
                className="border-brand-contrast/30 bg-transparent text-brand-contrast hover:bg-brand-contrast/10"
                onClick={() => void signOut()}
                size="sm"
                variant="outline"
              >
                Sign out
              </Button>
            </>
          ) : (
            <Button onClick={() => navigate('/login')} size="sm">
              Sign in
            </Button>
          )}
        </div>

        <button
          aria-expanded={menuOpen}
          aria-label="Toggle navigation"
          className="grid size-11 place-items-center rounded-lg border border-brand-contrast/25 sm:hidden"
          onClick={() => setMenuOpen((current) => !current)}
          type="button"
        >
          <MenuIcon open={menuOpen} />
        </button>
      </div>

      {menuOpen ? (
        <nav
          aria-label="Mobile primary"
          className="border-t border-brand-contrast/10 px-5 pb-5 sm:hidden"
        >
          <div className="grid gap-1 pt-3">
            {!management
              ? navigation.map((item) => (
                  <Link
                    className="rounded-lg px-3 py-3 text-sm font-semibold hover:bg-brand-contrast/10"
                    key={item.label}
                    onClick={() => setMenuOpen(false)}
                    to={item.to}
                  >
                    {item.label}
                  </Link>
                ))
              : null}
            {!management ? (
              <button
                className="flex items-center gap-2 rounded-lg px-3 py-3 text-left text-sm font-semibold hover:bg-brand-contrast/10"
                onClick={() => {
                  setMenuOpen(false);
                  onCityClick?.();
                }}
                type="button"
              >
                <LocationIcon /> {city}
              </button>
            ) : null}
            {user ? (
              <>
                <Link
                  className="rounded-lg px-3 py-3 text-sm font-semibold hover:bg-brand-contrast/10"
                  onClick={() => setMenuOpen(false)}
                  to={user.role === 'ADMIN' ? '/admin' : '/account'}
                >
                  My account
                </Link>
                <button
                  className="rounded-lg px-3 py-3 text-left text-sm font-semibold hover:bg-brand-contrast/10"
                  onClick={() => void signOut()}
                  type="button"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                className="rounded-lg bg-brand px-3 py-3 text-center text-sm font-semibold"
                onClick={() => setMenuOpen(false)}
                to="/login"
              >
                Sign in
              </Link>
            )}
          </div>
        </nav>
      ) : null}
    </header>
  );
}

function navIsActive(label: string, pathname: string, search: string) {
  if (label === 'My bookings') return pathname.startsWith('/bookings');
  if (pathname !== '/movies') return false;
  const type = new URLSearchParams(search).get('contentType');
  return label === 'Events' ? type === 'event' : type !== 'event';
}

function LocationIcon() {
  return (
    <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 24 24">
      <path d="m7 10 5 5 5-5" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
      {open ? (
        <path
          d="m6 6 12 12M18 6 6 18"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2"
        />
      ) : (
        <path
          d="M4 7h16M4 12h16M4 17h16"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2"
        />
      )}
    </svg>
  );
}
