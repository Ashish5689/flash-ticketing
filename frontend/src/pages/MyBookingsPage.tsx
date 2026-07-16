import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { CatalogShell } from '../components/layout/CatalogShell';
import { Badge, Card, Spinner } from '../components/ui';
import { getBookings } from '../lib/booking-api';

function formatRupees(priceCents: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(priceCents / 100);
}

export default function MyBookingsPage() {
  const bookingsQuery = useQuery({ queryKey: ['bookings'], queryFn: getBookings });
  return (
    <CatalogShell>
      <main className="mx-auto w-full max-w-content flex-1 px-5 py-10 sm:px-8">
        <p className="text-sm font-semibold text-brand">Tickets</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">My bookings</h1>
        <p className="mt-2 text-muted">Your confirmed movie tickets, newest first.</p>

        {bookingsQuery.isLoading ? (
          <div className="grid min-h-72 place-items-center">
            <Spinner label="Loading bookings" />
          </div>
        ) : null}
        {bookingsQuery.isError ? (
          <p className="mt-8 rounded bg-brand-soft p-4 text-brand">Bookings could not be loaded.</p>
        ) : null}
        {bookingsQuery.data?.length === 0 ? (
          <div className="mt-8 rounded-lg border border-dashed border-border bg-surface px-6 py-16 text-center">
            <h2 className="text-2xl font-bold">No tickets yet</h2>
            <p className="mt-2 text-muted">Choose a movie and book your first show.</p>
            <Link className="mt-6 inline-block font-semibold text-brand" to="/movies">
              Browse movies
            </Link>
          </div>
        ) : null}
        <div className="mt-8 grid gap-5">
          {bookingsQuery.data?.map((booking) => (
            <Link key={booking.id} to={`/bookings/${booking.id}`}>
              <Card className="flex flex-col gap-5 transition duration-fast hover:border-brand sm:flex-row sm:items-center">
                <img
                  alt=""
                  className="h-32 w-24 rounded object-cover"
                  src={booking.movie.posterUrl}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-bold">{booking.movie.title}</h2>
                    <Badge variant="nowShowing">{booking.status}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted">
                    {booking.theater.name}, {booking.theater.city} · {booking.screen.name}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {new Date(booking.show.startsAt).toLocaleString(undefined, {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                  <p className="mt-3 font-semibold">
                    Seats {booking.seats.map((seat) => seat.label).join(', ')} ·{' '}
                    {formatRupees(booking.amountCents)}
                  </p>
                </div>
                <span className="font-semibold text-brand">View ticket →</span>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </CatalogShell>
  );
}
