import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { logoutSession } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../ui';

type NavbarProps = {
  onCityClick?: () => void;
  management?: boolean;
};

const navigation = [
  { label: 'Movies', to: '/movies' },
  { label: 'Events', to: '/#movies' },
  { label: 'Plays', to: '/#movies' },
  { label: 'Sports', to: '/#movies' },
];

export function Navbar({ onCityClick, management = false }: NavbarProps) {
  const navigate = useNavigate();
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
    <header className="bg-surface-dark text-brand-contrast">
      <div className="mx-auto flex min-h-20 max-w-content items-center justify-between gap-6 px-5 sm:px-8">
        <Link className="shrink-0 text-xl font-bold tracking-tight sm:text-2xl" to="/">
          Book My Show
        </Link>

        {!management ? (
          <nav aria-label="Primary" className="hidden items-center gap-8 lg:flex">
            {navigation.map((item) => (
              <Link
                className="text-sm font-medium text-brand-contrast transition duration-fast hover:text-brand"
                key={item.label}
                to={item.to}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        ) : (
          <div className="hidden flex-1 lg:block" />
        )}

        <div className="hidden items-center gap-3 sm:flex">
          {!management ? (
            <button
              className="inline-flex min-h-11 items-center gap-2 rounded border border-muted px-4 text-sm font-medium transition duration-fast hover:border-brand-contrast"
              onClick={onCityClick}
              type="button"
            >
              <LocationIcon />
              Mumbai
              <ChevronDownIcon />
            </button>
          ) : null}
          {user ? (
            <>
              <Link className="px-2 text-sm font-medium hover:text-brand" to="/bookings">
                My bookings
              </Link>
              <Button
                onClick={() => navigate(user.role === 'ADMIN' ? '/admin' : '/account')}
                size="sm"
                variant="outline"
              >
                {user.name.split(' ')[0]}
              </Button>
              <Button onClick={() => void signOut()} size="sm" variant="outline">
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
          className="grid size-11 place-items-center rounded border border-muted sm:hidden"
          onClick={() => setMenuOpen((current) => !current)}
          type="button"
        >
          <MenuIcon open={menuOpen} />
        </button>
      </div>

      {menuOpen ? (
        <nav aria-label="Mobile primary" className="border-t border-muted px-5 pb-5 sm:hidden">
          <div className="grid gap-1 pt-3">
            {!management
              ? navigation.map((item) => (
                  <Link
                    className="rounded px-3 py-3 text-sm font-medium hover:bg-foreground"
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
                className="flex items-center gap-2 rounded px-3 py-3 text-left text-sm font-medium hover:bg-foreground"
                onClick={() => {
                  setMenuOpen(false);
                  onCityClick?.();
                }}
                type="button"
              >
                <LocationIcon /> Mumbai
              </button>
            ) : null}
            {user ? (
              <>
                <Link
                  className="rounded px-3 py-3 text-sm font-medium hover:bg-foreground"
                  onClick={() => setMenuOpen(false)}
                  to="/bookings"
                >
                  My bookings
                </Link>
                <Link
                  className="rounded px-3 py-3 text-sm font-medium hover:bg-foreground"
                  onClick={() => setMenuOpen(false)}
                  to={user.role === 'ADMIN' ? '/admin' : '/account'}
                >
                  My account
                </Link>
                <button
                  className="rounded px-3 py-3 text-left text-sm font-medium hover:bg-foreground"
                  onClick={() => void signOut()}
                  type="button"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                className="rounded px-3 py-3 text-sm font-medium hover:bg-foreground"
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
