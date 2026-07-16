import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { Link, useParams } from 'react-router-dom';

import { CatalogShell } from '../components/layout/CatalogShell';
import { Badge, Card, Spinner } from '../components/ui';
import { getBooking } from '../lib/booking-api';

function formatRupees(priceCents: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(priceCents / 100);
}

export default function OrderConfirmationPage() {
  const { orderId = '' } = useParams();
  const bookingQuery = useQuery({
    queryKey: ['booking', orderId],
    queryFn: () => getBooking(orderId),
    enabled: Boolean(orderId),
  });

  return (
    <CatalogShell>
      <main className="flex-1 bg-background px-5 py-10 sm:px-8">
        {bookingQuery.isLoading ? (
          <div className="grid min-h-[36rem] place-items-center">
            <Spinner label="Loading ticket" />
          </div>
        ) : null}
        {bookingQuery.isError ? (
          <div className="mx-auto max-w-xl py-16 text-center">
            <h1 className="text-3xl font-bold">Ticket not found</h1>
            <Link className="mt-5 inline-block font-semibold text-brand" to="/bookings">
              View my bookings
            </Link>
          </div>
        ) : null}
        {bookingQuery.data ? (
          <div className="mx-auto max-w-3xl">
            <div className="text-center">
              <div className="mx-auto grid size-14 place-items-center rounded-full bg-success text-brand-contrast">
                <CheckIcon />
              </div>
              <p className="mt-5 text-sm font-semibold text-success">Booking confirmed</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight">Your tickets are ready</h1>
              <p className="mt-2 text-muted">Show this QR ticket at the cinema entrance.</p>
            </div>

            <Card className="mt-8 overflow-hidden p-0">
              <div className="grid md:grid-cols-[1fr_15rem]">
                <div className="p-6 sm:p-8">
                  <div className="flex gap-4">
                    <img
                      alt=""
                      className="h-32 w-24 rounded object-cover"
                      src={bookingQuery.data.movie.posterUrl}
                    />
                    <div>
                      <h2 className="text-2xl font-bold">{bookingQuery.data.movie.title}</h2>
                      <p className="mt-2 text-sm text-muted">
                        {bookingQuery.data.theater.name}, {bookingQuery.data.theater.city}
                      </p>
                      <p className="mt-1 text-sm text-muted">{bookingQuery.data.screen.name}</p>
                      <p className="mt-1 text-sm font-medium">
                        {new Date(bookingQuery.data.show.startsAt).toLocaleString(undefined, {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                  <dl className="mt-7 grid gap-5 border-t border-dashed border-border pt-6 sm:grid-cols-3">
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-muted">Seats</dt>
                      <dd className="mt-1 font-bold">
                        {bookingQuery.data.seats.map((seat) => seat.label).join(', ')}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-muted">Amount</dt>
                      <dd className="mt-1 font-bold">
                        {formatRupees(bookingQuery.data.amountCents)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-muted">Payment</dt>
                      <dd className="mt-1">
                        <Badge variant="nowShowing">{bookingQuery.data.payment.status}</Badge>
                      </dd>
                    </div>
                  </dl>
                </div>
                <div className="grid place-items-center border-t border-dashed border-border bg-surface-subtle p-6 text-center md:border-l md:border-t-0">
                  <div>
                    <div className="rounded-lg bg-surface p-3">
                      <QRCodeSVG
                        aria-label="Booking QR ticket"
                        size={168}
                        value={bookingQuery.data.ticket.qrPayload}
                      />
                    </div>
                    <p className="mt-3 font-mono text-xs font-semibold">
                      {bookingQuery.data.ticket.code}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
            <div className="mt-6 text-center">
              <Link className="font-semibold text-brand" to="/bookings">
                View all bookings
              </Link>
            </div>
          </div>
        ) : null}
      </main>
    </CatalogShell>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" className="size-7" fill="none" viewBox="0 0 24 24">
      <path
        d="m5 12 4 4L19 6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.5"
      />
    </svg>
  );
}
