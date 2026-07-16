import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  cancelOrganizerShow,
  createOrganizerShow,
  getMovies,
  getOrganizerShows,
  getTheaters,
  publishOrganizerShow,
} from '../../lib/catalog-api';
import type { Movie, OrganizerShow, Screen, SeatTier, Theater } from '../../types/catalog';
import { Badge, Button, Card, Input, Modal, Select, Spinner } from '../ui';

const tierOrder: SeatTier[] = ['CLASSIC', 'PRIME', 'RECLINER'];

function defaultStartValue() {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  date.setHours(19, 0, 0, 0);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function formatShowDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatPrice(priceCents: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(priceCents / 100);
}

export function ShowWorkspace() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const showsQuery = useQuery({
    queryKey: ['organizer-shows'],
    queryFn: () => getOrganizerShows(),
  });
  const theatersQuery = useQuery({ queryKey: ['theaters'], queryFn: getTheaters });
  const moviesQuery = useQuery({ queryKey: ['movies'], queryFn: () => getMovies() });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['organizer-shows'] });
  const createMutation = useMutation({
    mutationFn: createOrganizerShow,
    onSuccess: async () => {
      setFormOpen(false);
      await refresh();
    },
  });
  const publishMutation = useMutation({ mutationFn: publishOrganizerShow, onSuccess: refresh });
  const cancelMutation = useMutation({ mutationFn: cancelOrganizerShow, onSuccess: refresh });
  const screens = useMemo(
    () =>
      (theatersQuery.data ?? []).flatMap((theater) =>
        theater.screens.map((screen) => ({ screen, theater })),
      ),
    [theatersQuery.data],
  );
  const loading = showsQuery.isLoading || theatersQuery.isLoading || moviesQuery.isLoading;
  const hasSetup = (moviesQuery.data?.length ?? 0) > 0 && screens.length > 0;

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Show workspace</h1>
          <p className="mt-3 text-muted">
            Schedule published movies, set tier pricing, then generate seats when sales open.
          </p>
        </div>
        <Button disabled={!hasSetup} onClick={() => setFormOpen(true)}>
          Create show
        </Button>
      </div>

      {loading ? (
        <div className="grid min-h-72 place-items-center">
          <Spinner label="Loading shows" />
        </div>
      ) : null}
      {showsQuery.isError || theatersQuery.isError || moviesQuery.isError ? (
        <p className="mt-8 rounded bg-brand-soft p-4 text-brand">
          Show workspace data could not be loaded.
        </p>
      ) : null}
      {!loading && !hasSetup ? (
        <div className="mt-8 rounded-lg border border-dashed border-border bg-surface px-6 py-14 text-center">
          <h2 className="text-2xl font-bold">A screen is required first</h2>
          <p className="mt-2 text-muted">
            Add an active theater and at least one screen before scheduling a show.
          </p>
        </div>
      ) : null}
      {!loading && hasSetup && showsQuery.data?.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-border bg-surface px-6 py-14 text-center">
          <h2 className="text-2xl font-bold">No shows scheduled</h2>
          <p className="mt-2 text-muted">Create a show and review it before opening sales.</p>
          <Button className="mt-6" onClick={() => setFormOpen(true)}>
            Create show
          </Button>
        </div>
      ) : null}
      <div className="mt-8 grid gap-4">
        {showsQuery.data?.map((show) => (
          <ShowCard
            cancelling={cancelMutation.isPending}
            key={show.id}
            onCancel={() => cancelMutation.mutate(show.id)}
            onPublish={() => publishMutation.mutate(show.id)}
            publishing={publishMutation.isPending}
            show={show}
          />
        ))}
      </div>

      <Modal
        className="max-h-[92vh] max-w-2xl overflow-y-auto"
        onClose={() => setFormOpen(false)}
        open={formOpen}
        title="Create show"
      >
        {formOpen ? (
          <ShowForm
            error={createMutation.error instanceof Error ? createMutation.error.message : null}
            loading={createMutation.isPending}
            movies={moviesQuery.data ?? []}
            onCancel={() => setFormOpen(false)}
            onSubmit={(input) => createMutation.mutateAsync(input).then(() => undefined)}
            screens={screens}
          />
        ) : null}
      </Modal>
    </>
  );
}

function ShowCard({
  show,
  publishing,
  cancelling,
  onPublish,
  onCancel,
}: {
  show: OrganizerShow;
  publishing: boolean;
  cancelling: boolean;
  onPublish: () => void;
  onCancel: () => void;
}) {
  return (
    <Card className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
      <img alt="" className="h-24 w-16 rounded object-cover" src={show.movie.posterUrl} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-bold">{show.movie.title}</h2>
          <Badge variant={show.status === 'onsale' ? 'nowShowing' : 'neutral'}>{show.status}</Badge>
        </div>
        <p className="mt-2 text-sm text-muted">
          {formatShowDate(show.startsAt)} · {show.theater.name}, {show.theater.city} ·{' '}
          {show.screen.name}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {show.pricing.map((price) => (
            <span
              className="rounded-full bg-surface-subtle px-3 py-1 text-xs font-medium text-muted"
              key={price.tier}
            >
              {price.tier} {formatPrice(price.priceCents)}
            </span>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 sm:justify-end">
        {show.status === 'scheduled' ? (
          <Button disabled={publishing} onClick={onPublish} size="sm">
            Open sales
          </Button>
        ) : null}
        {show.status === 'scheduled' || show.status === 'onsale' ? (
          <Button disabled={cancelling} onClick={onCancel} size="sm" variant="ghost">
            Cancel show
          </Button>
        ) : null}
      </div>
    </Card>
  );
}

function ShowForm({
  movies,
  screens,
  loading,
  error,
  onSubmit,
  onCancel,
}: {
  movies: Movie[];
  screens: Array<{ screen: Screen; theater: Theater }>;
  loading: boolean;
  error: string | null;
  onSubmit: (input: {
    movieId: string;
    screenId: string;
    startsAt: string;
    pricing: Array<{ tier: SeatTier; priceCents: number }>;
  }) => Promise<void>;
  onCancel: () => void;
}) {
  const [screenId, setScreenId] = useState(screens[0]?.screen.id ?? '');
  const [prices, setPrices] = useState<Record<SeatTier, string>>({
    CLASSIC: '200',
    PRIME: '300',
    RECLINER: '500',
  });
  const screenById = useMemo(
    () => new Map(screens.map((option) => [option.screen.id, option])),
    [screens],
  );
  const selected = screenById.get(screenId);
  const tiers = tierOrder.filter((tier) =>
    selected?.screen.layout.rows.some((row) => row.tier === tier),
  );
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await onSubmit({
      movieId: String(data.get('movieId')),
      screenId,
      startsAt: new Date(String(data.get('startsAt'))).toISOString(),
      pricing: tiers.map((tier) => ({ tier, priceCents: Math.round(Number(prices[tier]) * 100) })),
    });
  };

  return (
    <form className="grid gap-5" onSubmit={(event) => void submit(event)}>
      <Select label="Movie" name="movieId" required>
        {movies.map((movie) => (
          <option key={movie.id} value={movie.id}>
            {movie.title}
          </option>
        ))}
      </Select>
      <Select
        label="Theater and screen"
        onChange={(event) => setScreenId(event.target.value)}
        required
        value={screenId}
      >
        {screens.map(({ screen, theater }) => (
          <option key={screen.id} value={screen.id}>
            {theater.name}, {theater.city} — {screen.name}
          </option>
        ))}
      </Select>
      <Input
        defaultValue={defaultStartValue()}
        label="Starts at"
        min={defaultStartValue()}
        name="startsAt"
        required
        type="datetime-local"
      />
      <fieldset className="grid gap-3">
        <legend className="mb-1 text-sm font-medium">Tier pricing</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {tiers.map((tier) => (
            <Input
              key={tier}
              label={`${tier} (₹)`}
              min={1}
              onChange={(event) =>
                setPrices((current) => ({ ...current, [tier]: event.target.value }))
              }
              required
              step="1"
              type="number"
              value={prices[tier]}
            />
          ))}
        </div>
      </fieldset>
      {error ? <p className="rounded bg-brand-soft p-3 text-sm text-brand">{error}</p> : null}
      <div className="flex justify-end gap-3">
        <Button onClick={onCancel} variant="outline">
          Cancel
        </Button>
        <Button disabled={loading || tiers.length === 0} type="submit">
          {loading ? 'Creating…' : 'Create scheduled show'}
        </Button>
      </div>
    </form>
  );
}
