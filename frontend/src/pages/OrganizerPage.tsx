import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Navbar } from '../components/layout/Navbar';
import { ShowWorkspace } from '../components/organizer/ShowWorkspace';
import { OrganizerDashboard } from '../components/organizer/OrganizerDashboard';
import { Badge, Button, Card, Input, Modal, Select, Spinner, Textarea } from '../components/ui';
import {
  createScreen,
  createTheater,
  deleteScreen,
  deleteTheater,
  getTheaters,
  updateScreen,
  updateTheater,
} from '../lib/catalog-api';
import type { Screen, ScreenLayout, SeatTier, Theater } from '../types/catalog';

export default function OrganizerPage() {
  const queryClient = useQueryClient();
  const [workspace, setWorkspace] = useState<'dashboard' | 'theaters' | 'shows'>('dashboard');
  const [theaterModal, setTheaterModal] = useState(false);
  const [screenTarget, setScreenTarget] = useState<{ theaterId: string; screen?: Screen } | null>(
    null,
  );
  const [deleteCandidate, setDeleteCandidate] = useState<string | null>(null);
  const theatersQuery = useQuery({ queryKey: ['theaters'], queryFn: getTheaters });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['theaters'] });
  const createTheaterMutation = useMutation({
    mutationFn: createTheater,
    onSuccess: async () => {
      setTheaterModal(false);
      await refresh();
    },
  });
  const updateTheaterMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Theater['status'] }) =>
      updateTheater(id, { status }),
    onSuccess: refresh,
  });
  const deleteTheaterMutation = useMutation({
    mutationFn: deleteTheater,
    onSuccess: async () => {
      setDeleteCandidate(null);
      await refresh();
    },
  });
  const saveScreenMutation = useMutation({
    mutationFn: ({
      target,
      name,
      layout,
    }: {
      target: NonNullable<typeof screenTarget>;
      name: string;
      layout: ScreenLayout;
    }) =>
      target.screen
        ? updateScreen(target.screen.id, { name, layout })
        : createScreen(target.theaterId, { name, layout }),
    onSuccess: async () => {
      setScreenTarget(null);
      await refresh();
    },
  });
  const deleteScreenMutation = useMutation({ mutationFn: deleteScreen, onSuccess: refresh });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar management />
      <main className="mx-auto w-full max-w-content flex-1 px-5 py-10 sm:px-8">
        <nav aria-label="Organizer workspace" className="mb-8 flex gap-2">
          {(['dashboard', 'theaters', 'shows'] as const).map((item) => (
            <button
              aria-pressed={workspace === item}
              className={
                workspace === item
                  ? 'min-h-10 rounded bg-surface-dark px-5 text-sm font-semibold capitalize text-brand-contrast'
                  : 'min-h-10 rounded border border-border bg-surface px-5 text-sm font-semibold capitalize text-muted hover:border-brand hover:text-brand'
              }
              key={item}
              onClick={() => setWorkspace(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </nav>
        {workspace === 'dashboard' ? (
          <OrganizerDashboard />
        ) : workspace === 'shows' ? (
          <ShowWorkspace />
        ) : (
          <>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-4xl font-bold tracking-tight">Theater workspace</h1>
                <p className="mt-3 text-muted">
                  Create venues and design each screen’s tiered seat layout.
                </p>
              </div>
              <Button onClick={() => setTheaterModal(true)}>Add theater</Button>
            </div>
            {theatersQuery.isLoading ? (
              <div className="grid min-h-72 place-items-center">
                <Spinner label="Loading theaters" />
              </div>
            ) : null}
            {theatersQuery.isError ? (
              <p className="mt-8 rounded bg-brand-soft p-4 text-brand">
                Theater data could not be loaded.
              </p>
            ) : null}
            {theatersQuery.data?.length === 0 ? (
              <div className="mt-8 rounded-lg border border-dashed border-border bg-surface px-6 py-16 text-center">
                <h2 className="text-2xl font-bold">Add your first theater</h2>
                <p className="mt-2 text-muted">
                  Then create a screen and lay out its seats by tier.
                </p>
                <Button className="mt-6" onClick={() => setTheaterModal(true)}>
                  Add theater
                </Button>
              </div>
            ) : null}
            <div className="mt-8 grid gap-6">
              {theatersQuery.data?.map((theater) => (
                <TheaterPanel
                  deleteCandidate={deleteCandidate}
                  key={theater.id}
                  onAddScreen={() => setScreenTarget({ theaterId: theater.id })}
                  onDelete={() =>
                    deleteCandidate === theater.id
                      ? deleteTheaterMutation.mutate(theater.id)
                      : setDeleteCandidate(theater.id)
                  }
                  onDeleteScreen={(id) => deleteScreenMutation.mutate(id)}
                  onEditScreen={(screen) => setScreenTarget({ theaterId: theater.id, screen })}
                  onToggle={() =>
                    updateTheaterMutation.mutate({
                      id: theater.id,
                      status: theater.status === 'active' ? 'inactive' : 'active',
                    })
                  }
                  theater={theater}
                />
              ))}
            </div>
          </>
        )}
      </main>
      <Modal onClose={() => setTheaterModal(false)} open={theaterModal} title="Add theater">
        <TheaterForm
          loading={createTheaterMutation.isPending}
          onCancel={() => setTheaterModal(false)}
          onSubmit={(input) => createTheaterMutation.mutateAsync(input).then(() => undefined)}
        />
      </Modal>
      <Modal
        className="max-h-[92vh] max-w-4xl overflow-y-auto"
        onClose={() => setScreenTarget(null)}
        open={Boolean(screenTarget)}
        title={screenTarget?.screen ? 'Edit screen layout' : 'Create screen layout'}
      >
        {screenTarget ? (
          <ScreenBuilder
            loading={saveScreenMutation.isPending}
            screen={screenTarget.screen}
            onCancel={() => setScreenTarget(null)}
            onSubmit={(name, layout) =>
              saveScreenMutation
                .mutateAsync({ target: screenTarget, name, layout })
                .then(() => undefined)
            }
          />
        ) : null}
      </Modal>
    </div>
  );
}

function TheaterPanel({
  theater,
  deleteCandidate,
  onAddScreen,
  onDelete,
  onDeleteScreen,
  onEditScreen,
  onToggle,
}: {
  theater: Theater;
  deleteCandidate: string | null;
  onAddScreen: () => void;
  onDelete: () => void;
  onDeleteScreen: (id: string) => void;
  onEditScreen: (screen: Screen) => void;
  onToggle: () => void;
}) {
  return (
    <Card className="p-0">
      <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold">{theater.name}</h2>
            <Badge variant={theater.status === 'active' ? 'nowShowing' : 'neutral'}>
              {theater.status}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-muted">
            {theater.address} · {theater.city}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onAddScreen} size="sm">
            Add screen
          </Button>
          <Button onClick={onToggle} size="sm" variant="outline">
            Set {theater.status === 'active' ? 'inactive' : 'active'}
          </Button>
          <Button onClick={onDelete} size="sm" variant="ghost">
            {deleteCandidate === theater.id ? 'Confirm delete' : 'Delete'}
          </Button>
        </div>
      </div>
      {theater.screens.length === 0 ? (
        <p className="p-6 text-sm text-muted">No screens yet. Add one to build its seat layout.</p>
      ) : (
        <div className="grid gap-4 p-5 lg:grid-cols-2">
          {theater.screens.map((screen) => (
            <ScreenCard
              key={screen.id}
              onDelete={() => onDeleteScreen(screen.id)}
              onEdit={() => onEditScreen(screen)}
              screen={screen}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

function ScreenCard({
  screen,
  onDelete,
  onEdit,
}: {
  screen: Screen;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const totalSeats = screen.layout.rows.reduce((sum, row) => sum + row.seatCount, 0);
  return (
    <article className="rounded-lg border border-border bg-surface-subtle p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold">{screen.name}</h3>
          <p className="mt-1 text-xs text-muted">
            {screen.layout.rows.length} rows · {totalSeats} seats
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={onEdit} size="sm" variant="outline">
            Edit
          </Button>
          <Button onClick={onDelete} size="sm" variant="ghost">
            Delete
          </Button>
        </div>
      </div>
      <SeatPreview layout={screen.layout} />
    </article>
  );
}

export function TheaterForm({
  loading,
  onCancel,
  onSubmit,
}: {
  loading: boolean;
  onCancel: () => void;
  onSubmit: (input: { name: string; city: string; address: string }) => Promise<void>;
}) {
  const [error, setError] = useState<string | null>(null);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const data = new FormData(event.currentTarget);
    const input = {
      name: String(data.get('name')).trim(),
      city: String(data.get('city')).trim(),
      address: String(data.get('address')).trim(),
    };
    if (input.address.length < 8) {
      setError('Address must be at least 8 characters and include a street or area.');
      return;
    }
    try {
      await onSubmit(input);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : 'Could not create the theater.',
      );
    }
  };
  return (
    <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
      <Input label="Theater name" maxLength={180} minLength={2} name="name" required />
      <Input
        defaultValue="Mumbai"
        label="City"
        maxLength={120}
        minLength={2}
        name="city"
        required
      />
      <Textarea
        hint="Include the street or area; at least 8 characters."
        label="Address"
        maxLength={500}
        minLength={8}
        name="address"
        required
      />
      {error ? (
        <p className="rounded bg-brand-soft p-3 text-sm text-brand" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex justify-end gap-3">
        <Button onClick={onCancel} variant="outline">
          Cancel
        </Button>
        <Button disabled={loading} type="submit">
          {loading ? 'Creating…' : 'Create theater'}
        </Button>
      </div>
    </form>
  );
}

function ScreenBuilder({
  screen,
  loading,
  onCancel,
  onSubmit,
}: {
  screen?: Screen;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (name: string, layout: ScreenLayout) => Promise<void>;
}) {
  const [name, setName] = useState(screen?.name ?? 'Screen 1');
  const [rows, setRows] = useState<ScreenLayout['rows']>(
    () =>
      screen?.layout.rows ?? [
        { label: 'A', seatCount: 10, tier: 'CLASSIC' },
        { label: 'B', seatCount: 10, tier: 'PRIME' },
      ],
  );
  const [aisles, setAisles] = useState(screen?.layout.aisleAfterColumns.join(', ') ?? '5');
  const updateRow = (index: number, patch: Partial<ScreenLayout['rows'][number]>) =>
    setRows((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)),
    );
  const addRow = () =>
    setRows((current) => [
      ...current,
      { label: String.fromCharCode(65 + current.length), seatCount: 10, tier: 'CLASSIC' },
    ]);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit(name, {
      rows,
      aisleAfterColumns: aisles
        .split(',')
        .map((value) => Number(value.trim()))
        .filter((value) => Number.isInteger(value) && value > 0),
    });
  };
  return (
    <form className="grid gap-6" onSubmit={(event) => void submit(event)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Screen name"
          onChange={(event) => setName(event.target.value)}
          required
          value={name}
        />
        <Input
          hint="Comma-separated seat columns"
          label="Aisles after columns"
          onChange={(event) => setAisles(event.target.value)}
          value={aisles}
        />
      </div>
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-bold">Rows and tiers</h3>
          <Button disabled={rows.length >= 26} onClick={addRow} size="sm" variant="outline">
            Add row
          </Button>
        </div>
        <div className="grid gap-3">
          {rows.map((row, index) => (
            <div
              className="grid grid-cols-[5rem_1fr_1fr_auto] items-end gap-3 rounded border border-border p-3"
              key={`${row.label}-${index}`}
            >
              <Input
                aria-label={`Row ${index + 1} label`}
                label="Row"
                maxLength={4}
                onChange={(event) => updateRow(index, { label: event.target.value.toUpperCase() })}
                value={row.label}
              />
              <Input
                aria-label={`Row ${row.label} seats`}
                label="Seats"
                max={40}
                min={1}
                onChange={(event) => updateRow(index, { seatCount: Number(event.target.value) })}
                type="number"
                value={row.seatCount}
              />
              <Select
                aria-label={`Row ${row.label} tier`}
                label="Tier"
                onChange={(event) => updateRow(index, { tier: event.target.value as SeatTier })}
                value={row.tier}
              >
                <option>CLASSIC</option>
                <option>PRIME</option>
                <option>RECLINER</option>
              </Select>
              <Button
                disabled={rows.length === 1}
                onClick={() =>
                  setRows((current) => current.filter((_, rowIndex) => rowIndex !== index))
                }
                size="sm"
                variant="ghost"
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 className="mb-3 font-bold">Live seat preview</h3>
        <SeatPreview layout={{ rows, aisleAfterColumns: [] }} />
      </div>
      <div className="flex justify-end gap-3">
        <Button onClick={onCancel} variant="outline">
          Cancel
        </Button>
        <Button disabled={loading} type="submit">
          {loading ? 'Saving…' : 'Save screen'}
        </Button>
      </div>
    </form>
  );
}

function SeatPreview({ layout }: { layout: ScreenLayout }) {
  return (
    <div className="overflow-x-auto rounded-lg bg-surface-dark p-4 text-brand-contrast">
      <div className="mx-auto mb-5 h-1 w-3/4 rounded bg-brand-contrast" />
      <div className="grid min-w-max gap-2">
        {layout.rows.map((row) => (
          <div className="flex items-center gap-2" key={row.label}>
            <span className="w-6 text-xs text-brand-contrast">{row.label}</span>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(row.seatCount, 16) }, (_, index) => (
                <span
                  aria-hidden="true"
                  className={
                    row.tier === 'RECLINER'
                      ? 'h-3 w-4 rounded-sm bg-brand'
                      : row.tier === 'PRIME'
                        ? 'size-3 rounded-sm bg-seat-selected'
                        : 'size-3 rounded-sm border border-seat-available'
                  }
                  key={index}
                />
              ))}
            </div>
            <span className="ml-1 text-xs text-brand-contrast">{row.tier}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
