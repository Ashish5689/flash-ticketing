import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { CatalogShell } from '../components/layout/CatalogShell';
import { Badge, Button, Skeleton } from '../components/ui';
import { createSeatHold } from '../lib/booking-api';
import { getShowSeatMap } from '../lib/catalog-api';
import { cn } from '../lib/cn';
import { useAuthStore } from '../stores/authStore';
import type { SeatTier, ShowSeat } from '../types/catalog';

const tierLabels: Record<SeatTier, string> = {
  CLASSIC: 'Classic',
  PRIME: 'Prime',
  RECLINER: 'Recliner',
};

function formatRupees(priceCents: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(priceCents / 100);
}

export default function SeatMapPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [selected, setSelected] = useState<string[]>([]);
  const seatMapQuery = useQuery({
    queryKey: ['show-seats', id],
    queryFn: () => getShowSeatMap(id),
    enabled: Boolean(id),
    refetchInterval: 15_000,
  });
  const holdMutation = useMutation({
    mutationFn: () => createSeatHold(id, selected),
    onSuccess: (hold) => navigate(`/checkout/${hold.holdId}`),
    onError: () => void seatMapQuery.refetch(),
  });

  const toggleSeat = (label: string) => {
    setSelected((current) =>
      current.includes(label)
        ? current.filter((seat) => seat !== label)
        : current.length < 10
          ? [...current, label]
          : current,
    );
  };

  const continueToCheckout = () => {
    if (!user) {
      navigate('/login', { state: { from: `/shows/${id}/seats` } });
      return;
    }
    holdMutation.mutate();
  };

  return (
    <CatalogShell>
      <main className="flex-1 bg-background">
        {seatMapQuery.isLoading ? (
          <div className="mx-auto max-w-content px-5 py-10 sm:px-8">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="mt-8 h-[30rem] rounded-xl bg-surface-dark/80" />
          </div>
        ) : null}
        {seatMapQuery.isError ? (
          <div className="mx-auto max-w-content px-5 py-16 sm:px-8">
            <h1 className="text-3xl font-bold">Seat map unavailable</h1>
            <p className="mt-3 text-muted">This show may no longer be on sale.</p>
            <Link className="mt-6 inline-block font-semibold text-brand" to="/movies">
              Browse movies
            </Link>
          </div>
        ) : null}
        {seatMapQuery.data ? (
          <SeatMapContent
            data={seatMapQuery.data}
            error={holdMutation.error instanceof Error ? holdMutation.error.message : null}
            holding={holdMutation.isPending}
            onContinue={continueToCheckout}
            onToggle={toggleSeat}
            selected={selected}
            signedIn={Boolean(user)}
          />
        ) : null}
      </main>
    </CatalogShell>
  );
}

function SeatMapContent({
  data,
  selected,
  signedIn,
  holding,
  error,
  onToggle,
  onContinue,
}: {
  data: Awaited<ReturnType<typeof getShowSeatMap>>;
  selected: string[];
  signedIn: boolean;
  holding: boolean;
  error: string | null;
  onToggle: (label: string) => void;
  onContinue: () => void;
}) {
  const priceByTier = useMemo(
    () => new Map(data.show.pricing.map((price) => [price.tier, price.priceCents])),
    [data.show.pricing],
  );
  const seatByLabel = useMemo(
    () =>
      new Map(
        data.layout.rows.flatMap((row) => row.seats).map((seat) => [seat.label, seat] as const),
      ),
    [data.layout.rows],
  );
  const aisleColumns = useMemo(
    () => new Set(data.layout.aisleAfterColumns),
    [data.layout.aisleAfterColumns],
  );
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const selectedTotal = selected.reduce(
    (total, label) => total + (priceByTier.get(seatByLabel.get(label)?.tier ?? 'CLASSIC') ?? 0),
    0,
  );
  const availableCount = data.layout.rows.reduce(
    (count, row) => count + row.seats.filter((seat) => seat.status === 'available').length,
    0,
  );

  return (
    <>
      <section className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-content flex-col gap-5 px-5 py-7 sm:px-8 md:flex-row md:items-center">
          <img alt="" className="h-24 w-16 rounded object-cover" src={data.show.movie.posterUrl} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold">{data.show.movie.title}</h1>
              <Badge>{data.show.movie.certificate}</Badge>
            </div>
            <p className="mt-2 text-sm text-muted">
              {data.show.theater.name}, {data.show.theater.city} · {data.show.screen.name}
            </p>
            <p className="mt-1 text-sm text-muted">
              {new Date(data.show.startsAt).toLocaleString(undefined, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </p>
          </div>
          <div className="rounded-lg bg-success-soft px-5 py-3 text-sm font-semibold text-success">
            {availableCount} seats available
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-content px-5 py-8 sm:px-8">
        <div className="mb-6 flex flex-wrap gap-3">
          {[...priceByTier.entries()].map(([tier, price]) => (
            <span
              className="rounded-full border border-border bg-surface px-4 py-2 text-sm"
              key={tier}
            >
              <strong>{tierLabels[tier]}</strong> · {formatRupees(price)}
            </span>
          ))}
        </div>

        <p className="mb-3 text-center text-xs font-semibold text-muted sm:hidden">
          Swipe sideways to see every seat
        </p>
        <div
          className="overflow-x-auto rounded-xl bg-surface-dark px-5 py-8 shadow-md sm:px-8"
          tabIndex={0}
        >
          <div className="mx-auto min-w-max">
            <div className="mx-auto mb-10 w-3/4 max-w-3xl text-center">
              <div className="h-2 rounded-[50%] bg-brand-contrast shadow-sm" />
              <p className="mt-3 text-xs uppercase tracking-[0.3em] text-brand-contrast">Screen</p>
            </div>
            <div className="grid gap-4">
              {data.layout.rows.map((row) => (
                <div
                  className="grid grid-cols-[2.5rem_1fr_2.5rem] items-center gap-3"
                  key={row.label}
                >
                  <span className="sticky left-0 z-10 grid h-10 place-items-center bg-surface-dark text-xs font-semibold text-brand-contrast">
                    {row.label}
                  </span>
                  <div className="flex justify-center gap-2.5">
                    {row.seats.map((seat) => (
                      <Seat
                        addAisle={aisleColumns.has(seat.number)}
                        key={seat.id}
                        onToggle={() => onToggle(seat.label)}
                        seat={seat}
                        selected={selectedSet.has(seat.label)}
                      />
                    ))}
                  </div>
                  <span className="sticky right-0 z-10 grid h-10 place-items-center bg-surface-dark text-xs font-semibold text-brand-contrast">
                    {row.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-5 text-sm text-muted">
          <Legend className="border-seat-available bg-surface" label="Available" />
          <Legend className="border-seat-selected bg-seat-selected" label="Selected" />
          <Legend className="border-seat-held bg-seat-held" label="Held" />
          <Legend className="border-seat-sold bg-seat-sold" label="Sold" />
        </div>

        <div className="sticky bottom-0 z-20 mx-auto mt-8 max-w-2xl rounded-t-xl border border-border bg-surface p-4 shadow-lg sm:bottom-4 sm:rounded-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">
                {selected.length ? selected.join(', ') : 'Select up to 10 seats'}
              </p>
              <p className="mt-1 text-sm text-muted">
                {selected.length} seat{selected.length === 1 ? '' : 's'} ·{' '}
                {formatRupees(selectedTotal)}
              </p>
              {selected.length === 10 ? (
                <p className="mt-1 text-xs font-semibold text-brand" role="status">
                  Maximum 10 seats selected
                </p>
              ) : null}
            </div>
            <Button disabled={selected.length === 0 || holding} onClick={onContinue}>
              {holding ? 'Holding seats…' : signedIn ? 'Continue' : 'Sign in to book'}
            </Button>
          </div>
          {error ? (
            <p className="mt-3 rounded bg-brand-soft p-3 text-sm text-brand" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </section>
    </>
  );
}

function Seat({
  seat,
  addAisle,
  selected,
  onToggle,
}: {
  seat: ShowSeat;
  addAisle: boolean;
  selected: boolean;
  onToggle: () => void;
}) {
  const unavailable = seat.status !== 'available';
  return (
    <button
      aria-label={`${seat.label}, ${tierLabels[seat.tier]}, ${selected ? 'selected' : seat.status}`}
      aria-pressed={selected}
      className={cn(
        'grid size-10 place-items-center rounded-md border text-xs font-semibold transition duration-fast',
        unavailable
          ? seat.status === 'held'
            ? 'cursor-not-allowed border-seat-held bg-seat-held text-foreground'
            : 'cursor-not-allowed border-seat-sold bg-seat-sold text-muted'
          : selected
            ? 'border-seat-selected bg-seat-selected text-brand-contrast'
            : 'border-seat-available bg-surface text-success hover:bg-success-soft',
        addAisle && 'mr-5',
      )}
      disabled={unavailable}
      onClick={onToggle}
      type="button"
    >
      {seat.number}
    </button>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={cn('size-5 rounded-sm border', className)} /> {label}
    </span>
  );
}
