import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { CatalogShell } from '../components/layout/CatalogShell';
import { Badge, Skeleton } from '../components/ui';
import { getBookings } from '../lib/booking-api';
import type { Booking } from '../types/booking';

function formatRupees(priceCents: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(priceCents / 100);
}

export default function MyBookingsPage() {
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const bookingsQuery = useQuery({ queryKey: ['bookings'], queryFn: getBookings });
  const grouped = useMemo(() => {
    const now = Date.now();
    const bookings = bookingsQuery.data ?? [];
    return {
      upcoming: bookings.filter((booking) => new Date(booking.show.startsAt).getTime() >= now),
      past: bookings.filter((booking) => new Date(booking.show.startsAt).getTime() < now),
    };
  }, [bookingsQuery.data]);
  const visible = grouped[tab];

  return (
    <CatalogShell>
      <main className="w-full flex-1 bg-surface">
        <section className="border-b border-border bg-surface-subtle px-5 py-10 sm:px-8">
          <div className="mx-auto max-w-content">
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">My bookings</h1>
            <p className="mt-2 text-muted">
              Every ticket and entrance QR code, ready when you need it.
            </p>
          </div>
        </section>

        <div className="mx-auto w-full max-w-content px-5 py-8 sm:px-8">
          <div
            className="inline-flex rounded-lg border border-border bg-surface p-1"
            role="tablist"
            aria-label="Booking history"
          >
            <TabButton
              active={tab === 'upcoming'}
              count={grouped.upcoming.length}
              label="Upcoming"
              onClick={() => setTab('upcoming')}
            />
            <TabButton
              active={tab === 'past'}
              count={grouped.past.length}
              label="Past"
              onClick={() => setTab('past')}
            />
          </div>

          {bookingsQuery.isLoading ? <BookingSkeleton /> : null}
          {bookingsQuery.isError ? (
            <div className="mt-8 rounded-xl border border-brand/25 bg-brand-soft p-6 text-center">
              <p className="font-bold">Bookings could not be loaded.</p>
              <button
                className="mt-3 text-sm font-bold text-brand underline"
                onClick={() => void bookingsQuery.refetch()}
                type="button"
              >
                Try again
              </button>
            </div>
          ) : null}
          {!bookingsQuery.isLoading && !bookingsQuery.isError && visible.length === 0 ? (
            <div className="mt-8 rounded-xl border border-dashed border-border bg-surface-subtle px-6 py-16 text-center">
              <h2 className="text-2xl font-extrabold">
                {tab === 'upcoming' ? 'No upcoming tickets' : 'No past tickets'}
              </h2>
              <p className="mt-2 text-muted">
                {tab === 'upcoming'
                  ? 'Find your next movie or live event.'
                  : 'Completed bookings will appear here.'}
              </p>
              {tab === 'upcoming' ? (
                <Link
                  className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-brand px-5 text-sm font-bold text-brand-contrast"
                  to="/movies"
                >
                  Explore listings
                </Link>
              ) : null}
            </div>
          ) : null}
          <div className="mt-8 grid gap-5">
            {visible.map((booking) => (
              <TicketRow booking={booking} key={booking.id} />
            ))}
          </div>
        </div>
      </main>
    </CatalogShell>
  );
}

function TabButton({
  active,
  count,
  label,
  onClick,
}: {
  active: boolean;
  count: number;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-selected={active}
      className={
        active
          ? 'rounded-md bg-surface-dark px-5 py-2.5 text-sm font-bold text-brand-contrast'
          : 'rounded-md px-5 py-2.5 text-sm font-bold text-muted hover:text-foreground'
      }
      onClick={onClick}
      role="tab"
      type="button"
    >
      {label} <span className="ml-1 opacity-70">{count}</span>
    </button>
  );
}

function TicketRow({ booking }: { booking: Booking }) {
  return (
    <Link
      className="group overflow-hidden rounded-xl border border-border bg-surface shadow-sm transition hover:border-brand hover:shadow-md"
      to={`/bookings/${booking.id}`}
    >
      <article className="grid sm:grid-cols-[8rem_1fr_auto] sm:items-stretch">
        <img
          alt={`${booking.movie.title} poster`}
          className="hidden size-full min-h-44 object-cover sm:block"
          src={booking.movie.posterUrl}
        />
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-extrabold">{booking.movie.title}</h2>
            <Badge variant="nowShowing">{booking.status}</Badge>
          </div>
          <p className="mt-3 text-sm font-semibold">
            {new Date(booking.show.startsAt).toLocaleString(undefined, {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
          <p className="mt-1 text-sm text-muted">
            {booking.theater.name}, {booking.theater.city} · {booking.screen.name}
          </p>
          <p className="mt-4 text-sm font-bold">
            Seats {booking.seats.map((seat) => seat.label).join(', ')} ·{' '}
            {formatRupees(booking.amountCents)}
          </p>
        </div>
        <div className="flex items-center justify-between border-t border-dashed border-border bg-surface-subtle px-5 py-4 text-sm font-bold text-brand sm:w-40 sm:flex-col sm:justify-center sm:border-l sm:border-t-0">
          <TicketIcon />
          <span>
            View ticket <span aria-hidden="true">→</span>
          </span>
        </div>
      </article>
    </Link>
  );
}

function BookingSkeleton() {
  return (
    <div className="mt-8 grid gap-5">
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton className="h-44 rounded-xl" key={index} />
      ))}
    </div>
  );
}

function TicketIcon() {
  return (
    <svg aria-hidden="true" className="mb-3 hidden size-8 sm:block" fill="none" viewBox="0 0 24 24">
      <path
        d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a3 3 0 0 0 0 6v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a3 3 0 0 0 0-6V7Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.75"
      />
      <path d="M12 8v2m0 4v2" stroke="currentColor" strokeLinecap="round" strokeWidth="1.75" />
    </svg>
  );
}
