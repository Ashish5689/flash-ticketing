import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { CatalogShell } from '../components/layout/CatalogShell';
import { Badge, Button, Card, Skeleton } from '../components/ui';
import {
  completeStripeCheckout,
  createStripeCheckout,
  getPaymentConfiguration,
  getSeatHold,
  releaseSeatHold,
} from '../lib/booking-api';
import { formatCountdown, useCountdown } from '../hooks/useCountdown';

function formatRupees(priceCents: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(priceCents / 100);
}

export default function CheckoutPage() {
  const { holdId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const attemptedSession = useRef<string | null>(null);
  const checkoutSessionId = searchParams.get('session_id');
  const holdQuery = useQuery({
    queryKey: ['seat-hold', holdId],
    queryFn: () => getSeatHold(holdId),
    enabled: Boolean(holdId),
    retry: false,
    refetchInterval: 30_000,
  });
  const seconds = useCountdown(holdQuery.data?.expiresAt);
  const paymentConfigQuery = useQuery({
    queryKey: ['payment-config'],
    queryFn: getPaymentConfiguration,
  });
  const startPaymentMutation = useMutation({
    mutationFn: () => createStripeCheckout(holdId, idempotencyKey),
    onSuccess: (session) => window.location.assign(session.url),
  });
  const confirmMutation = useMutation({
    mutationFn: (sessionId: string) => completeStripeCheckout(sessionId),
    onSuccess: (booking) => navigate(`/bookings/${booking.id}`, { replace: true }),
  });
  const completeCheckout = confirmMutation.mutate;
  const releaseMutation = useMutation({
    mutationFn: () => releaseSeatHold(holdId),
    onSettled: () => navigate(holdQuery.data ? `/shows/${holdQuery.data.showId}/seats` : '/movies'),
  });

  useEffect(() => {
    if (checkoutSessionId && attemptedSession.current !== checkoutSessionId) {
      attemptedSession.current = checkoutSessionId;
      completeCheckout(checkoutSessionId);
    }
  }, [checkoutSessionId, completeCheckout]);

  return (
    <CatalogShell>
      <main className="flex-1 bg-background">
        {holdQuery.isLoading ? (
          <div className="mx-auto grid max-w-content gap-7 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_22rem]">
            <Skeleton className="h-[32rem] rounded-xl" />
            <Skeleton className="h-80 rounded-xl" />
          </div>
        ) : null}
        {holdQuery.isError ? (
          <div className="mx-auto max-w-2xl px-5 py-20 text-center sm:px-8">
            <h1 className="text-3xl font-bold">Your seat hold expired</h1>
            <p className="mt-3 text-muted">Choose your seats again to continue booking.</p>
            <Button className="mt-7" onClick={() => navigate('/movies')}>
              Browse showtimes
            </Button>
          </div>
        ) : null}
        {holdQuery.data ? (
          <div className="mx-auto max-w-content px-5 py-10 sm:px-8">
            <ol
              className="mb-9 grid grid-cols-3 overflow-hidden rounded-xl border border-border bg-surface text-center text-xs font-bold sm:text-sm"
              aria-label="Booking progress"
            >
              <li className="border-r border-border px-3 py-3 text-success">
                <span className="mr-2" aria-hidden="true">
                  ✓
                </span>
                Seats
              </li>
              <li className="border-r border-border bg-brand-soft px-3 py-3 text-brand">
                <span className="mr-2" aria-hidden="true">
                  2
                </span>
                Payment
              </li>
              <li className="px-3 py-3 text-muted">
                <span className="mr-2" aria-hidden="true">
                  3
                </span>
                Ticket
              </li>
            </ol>
            <div className="grid gap-7 lg:grid-cols-[1fr_22rem]">
              <section>
                <h1 className="mt-1 text-3xl font-bold tracking-tight">Complete your booking</h1>
                <div className="mt-5 inline-flex items-center gap-3 rounded-xl border border-brand/20 bg-brand-soft px-4 py-3 text-brand">
                  <span className="text-sm font-medium">Seats held for</span>
                  <strong className="font-mono text-xl" aria-live="polite">
                    {formatCountdown(seconds)}
                  </strong>
                </div>

                <Card className="mt-7">
                  <div className="flex gap-4">
                    {holdQuery.data.show ? (
                      <img
                        alt=""
                        className="h-28 w-20 rounded object-cover"
                        src={holdQuery.data.show.movie.posterUrl}
                      />
                    ) : null}
                    <div>
                      <h2 className="text-xl font-bold">
                        {holdQuery.data.show?.movie.title ?? 'Ticket booking'}
                      </h2>
                      {holdQuery.data.show ? (
                        <>
                          <p className="mt-2 text-sm text-muted">
                            {holdQuery.data.show.theater.name}, {holdQuery.data.show.theater.city} ·{' '}
                            {holdQuery.data.show.screen.name}
                          </p>
                          <p className="mt-1 text-sm text-muted">
                            {new Date(holdQuery.data.show.startsAt).toLocaleString(undefined, {
                              weekday: 'long',
                              day: 'numeric',
                              month: 'long',
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </p>
                        </>
                      ) : null}
                      <div className="mt-4 flex flex-wrap gap-2">
                        {holdQuery.data.seats.map((seat) => (
                          <Badge key={seat.label}>{seat.label}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="mt-6">
                  <h2 className="text-lg font-bold">Secure payment</h2>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    You’ll continue to Stripe Checkout to pay securely. Flash Ticketing never
                    handles your card details.
                  </p>
                </Card>

                {startPaymentMutation.error instanceof Error ||
                confirmMutation.error instanceof Error ? (
                  <p className="mt-5 rounded bg-brand-soft p-4 text-sm text-brand" role="alert">
                    {startPaymentMutation.error instanceof Error
                      ? startPaymentMutation.error.message
                      : confirmMutation.error instanceof Error
                        ? confirmMutation.error.message
                        : null}
                  </p>
                ) : null}
              </section>

              <aside>
                <Card className="sticky top-4">
                  <h2 className="text-lg font-bold">Booking summary</h2>
                  <dl className="mt-5 grid gap-3 text-sm">
                    {holdQuery.data.seats.map((seat) => (
                      <div className="flex justify-between gap-4" key={seat.label}>
                        <dt>
                          {seat.label} · {seat.tier}
                        </dt>
                        <dd>{formatRupees(seat.priceCents)}</dd>
                      </div>
                    ))}
                    <div className="mt-2 flex justify-between border-t border-border pt-4 text-base font-bold">
                      <dt>Total</dt>
                      <dd>{formatRupees(holdQuery.data.amountCents)}</dd>
                    </div>
                  </dl>
                  <Button
                    className="mt-6"
                    disabled={
                      seconds === 0 ||
                      startPaymentMutation.isPending ||
                      confirmMutation.isPending ||
                      !paymentConfigQuery.data?.configured
                    }
                    fullWidth
                    onClick={() => startPaymentMutation.mutate()}
                    size="lg"
                  >
                    {confirmMutation.isPending
                      ? 'Confirming Stripe payment…'
                      : startPaymentMutation.isPending
                        ? 'Opening Stripe…'
                        : seconds === 0
                          ? 'Hold expired'
                          : paymentConfigQuery.data && !paymentConfigQuery.data.configured
                            ? 'Stripe setup required'
                            : `Pay ${formatRupees(holdQuery.data.amountCents)}`}
                  </Button>
                  <Button
                    className="mt-3"
                    disabled={
                      releaseMutation.isPending ||
                      confirmMutation.isPending ||
                      startPaymentMutation.isPending
                    }
                    fullWidth
                    onClick={() => releaseMutation.mutate()}
                    variant="outline"
                  >
                    Release seats
                  </Button>
                </Card>
              </aside>
            </div>
          </div>
        ) : null}
      </main>
    </CatalogShell>
  );
}
