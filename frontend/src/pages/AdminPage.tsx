import { useDeferredValue, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { MovieForm } from '../components/admin/MovieForm';
import { Navbar } from '../components/layout/Navbar';
import { Badge, Button, Input, Modal, Select, Spinner } from '../components/ui';
import {
  createAdminMovie,
  deleteAdminMovie,
  getAdminMovies,
  getOrganizerApplications,
  reviewOrganizerApplication,
  updateAdminMovie,
} from '../lib/catalog-api';
import type { Movie, MovieInput, OrganizerApplication } from '../types/catalog';
import { getAdminUsers, getPlatformDashboard, updateAdminUserStatus } from '../lib/analytics-api';
import type { AdminUser } from '../types/analytics';

type AdminSection = 'dashboard' | 'movies' | 'organizers' | 'users';

export default function AdminPage() {
  const [section, setSection] = useState<AdminSection>('dashboard');
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar management />
      <div className="mx-auto grid w-full max-w-content flex-1 md:grid-cols-[14rem_1fr]">
        <aside className="border-b border-border bg-surface px-4 py-5 md:border-b-0 md:border-r md:px-3 md:py-8">
          <nav aria-label="Administration" className="grid grid-cols-2 gap-2 md:grid-cols-1">
            <AdminNavButton
              active={section === 'dashboard'}
              onClick={() => setSection('dashboard')}
            >
              Dashboard
            </AdminNavButton>
            <AdminNavButton active={section === 'movies'} onClick={() => setSection('movies')}>
              Movies
            </AdminNavButton>
            <AdminNavButton
              active={section === 'organizers'}
              onClick={() => setSection('organizers')}
            >
              Organizer requests
            </AdminNavButton>
            <AdminNavButton active={section === 'users'} onClick={() => setSection('users')}>
              Users
            </AdminNavButton>
          </nav>
        </aside>
        <main className="min-w-0 px-5 py-8 sm:px-8">
          {section === 'dashboard' ? (
            <PlatformDashboard />
          ) : section === 'movies' ? (
            <MovieManagement />
          ) : section === 'organizers' ? (
            <OrganizerManagement />
          ) : (
            <UserManagement />
          )}
        </main>
      </div>
    </div>
  );
}

function money(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value / 100);
}

function PlatformDashboard() {
  const stats = useQuery({ queryKey: ['platform-dashboard'], queryFn: getPlatformDashboard });
  if (stats.isLoading)
    return (
      <div className="grid min-h-72 place-items-center">
        <Spinner label="Loading platform dashboard" />
      </div>
    );
  if (stats.isError)
    return (
      <p className="rounded bg-brand-soft p-4 text-brand">
        Platform dashboard could not be loaded.
      </p>
    );
  const data = stats.data!;
  const metrics = [
    ['Revenue', money(data.revenueCents)],
    ['Bookings', data.bookings],
    ['Active users', data.users.active],
    ['Organizers', data.users.organizers],
    ['Movies', data.movies],
    ['Theaters', data.theaters],
    ['Shows', data.shows],
    ['Pending requests', data.pendingOrganizers],
  ] as const;
  return (
    <section>
      <p className="text-sm font-semibold text-brand">Platform pulse</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">Admin dashboard</h1>
      <p className="mt-2 text-muted">Live catalog, partner, customer, and revenue totals.</p>
      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value]) => (
          <div className="rounded-lg border border-border bg-surface p-5" key={label}>
            <p className="text-sm text-muted">{label}</p>
            <p className="mt-2 text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>
      {data.users.suspended > 0 ? (
        <p className="mt-6 rounded bg-brand-soft p-4 text-sm text-brand">
          {data.users.suspended} suspended account{data.users.suspended === 1 ? '' : 's'} currently
          blocked.
        </p>
      ) : null}
    </section>
  );
}

function UserManagement() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const deferredSearch = useDeferredValue(search);
  const usersQuery = useQuery({
    queryKey: ['admin-users', deferredSearch, role, status],
    queryFn: () =>
      getAdminUsers({
        q: deferredSearch || undefined,
        role: role || undefined,
        status: status || undefined,
      }),
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, nextStatus }: { id: string; nextStatus: AdminUser['status'] }) =>
      updateAdminUserStatus(id, nextStatus),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
        queryClient.invalidateQueries({ queryKey: ['platform-dashboard'] }),
      ]);
    },
  });
  return (
    <section>
      <h1 className="text-3xl font-bold tracking-tight">User access</h1>
      <p className="mt-2 text-muted">Search accounts and suspend or restore platform access.</p>
      <div className="mt-7 grid gap-3 rounded-t-lg border border-border bg-surface p-4 sm:grid-cols-[1fr_11rem_11rem]">
        <Input
          aria-label="Search users"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name or email"
          value={search}
        />
        <Select
          aria-label="Filter user role"
          onChange={(event) => setRole(event.target.value)}
          value={role}
        >
          <option value="">All roles</option>
          <option>USER</option>
          <option>ORGANIZER</option>
          <option>ADMIN</option>
        </Select>
        <Select
          aria-label="Filter user status"
          onChange={(event) => setStatus(event.target.value)}
          value={status}
        >
          <option value="">All status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </Select>
      </div>
      <div className="overflow-x-auto rounded-b-lg border-x border-b border-border bg-surface">
        {usersQuery.isLoading ? (
          <div className="grid min-h-56 place-items-center">
            <Spinner label="Loading users" />
          </div>
        ) : null}
        {usersQuery.isError ? <p className="p-6 text-brand">Users could not be loaded.</p> : null}
        {usersQuery.data?.length === 0 ? (
          <p className="p-10 text-center text-muted">No users match these filters.</p>
        ) : null}
        {usersQuery.data && usersQuery.data.length > 0 ? (
          <table className="w-full min-w-[48rem] text-left text-sm">
            <thead className="bg-surface-subtle text-muted">
              <tr>
                <th className="px-5 py-3">User</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Provider</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {usersQuery.data.map((user) => (
                <tr className="border-t border-border" key={user.id}>
                  <td className="px-5 py-4">
                    <p className="font-semibold">{user.name}</p>
                    <p className="text-xs text-muted">{user.email}</p>
                  </td>
                  <td className="px-5 py-4">{user.role}</td>
                  <td className="px-5 py-4 text-muted">{user.provider}</td>
                  <td className="px-5 py-4">
                    <Badge variant={user.status === 'active' ? 'nowShowing' : 'neutral'}>
                      {user.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-4">
                    <Button
                      disabled={statusMutation.isPending}
                      onClick={() =>
                        statusMutation.mutate({
                          id: user.id,
                          nextStatus: user.status === 'active' ? 'suspended' : 'active',
                        })
                      }
                      size="sm"
                      variant={user.status === 'active' ? 'outline' : 'primary'}
                    >
                      {user.status === 'active' ? 'Suspend' : 'Restore'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
      {statusMutation.error instanceof Error ? (
        <p className="mt-4 rounded bg-brand-soft p-4 text-brand" role="alert">
          {statusMutation.error.message}
        </p>
      ) : null}
    </section>
  );
}

function AdminNavButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={
        active
          ? 'min-h-11 rounded bg-brand-soft px-4 text-left text-sm font-semibold text-brand'
          : 'min-h-11 rounded px-4 text-left text-sm font-medium text-muted hover:bg-surface-subtle hover:text-foreground'
      }
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function MovieManagement() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [editing, setEditing] = useState<Movie | null | undefined>(undefined);
  const [deleteCandidate, setDeleteCandidate] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search);
  const moviesQuery = useQuery({
    queryKey: ['admin-movies', deferredSearch, status],
    queryFn: () => getAdminMovies({ q: deferredSearch || undefined, status: status || undefined }),
  });
  const saveMutation = useMutation({
    mutationFn: ({ movie, input }: { movie: Movie | null; input: MovieInput }) =>
      movie ? updateAdminMovie(movie.id, input) : createAdminMovie(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-movies'] });
      await queryClient.invalidateQueries({ queryKey: ['movies'] });
      setEditing(undefined);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: deleteAdminMovie,
    onSuccess: async () => {
      setDeleteCandidate(null);
      await queryClient.invalidateQueries({ queryKey: ['admin-movies'] });
      await queryClient.invalidateQueries({ queryKey: ['movies'] });
    },
  });

  return (
    <section>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Platform management</h1>
          <p className="mt-2 text-sm text-muted">Publish and maintain the global movie catalog.</p>
        </div>
        <Button onClick={() => setEditing(null)}>Add movie</Button>
      </div>
      <div className="mt-7 grid gap-3 rounded-t-lg border border-border bg-surface p-4 sm:grid-cols-[1fr_12rem]">
        <Input
          aria-label="Search movies by title"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search movies by title"
          value={search}
        />
        <Select
          aria-label="Filter movie status"
          onChange={(event) => setStatus(event.target.value)}
          value={status}
        >
          <option value="">All status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </Select>
      </div>
      <div className="overflow-x-auto rounded-b-lg border-x border-b border-border bg-surface">
        {moviesQuery.isLoading ? (
          <div className="grid min-h-56 place-items-center">
            <Spinner label="Loading movies" />
          </div>
        ) : null}
        {moviesQuery.isError ? <p className="p-6 text-brand">Movies could not be loaded.</p> : null}
        {moviesQuery.data ? (
          <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
            <thead className="bg-surface-subtle text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Movie</th>
                <th className="px-5 py-3 font-medium">Languages</th>
                <th className="px-5 py-3 font-medium">Release date</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {moviesQuery.data.map((movie) => (
                <tr className="border-t border-border" key={movie.id}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <img
                        alt=""
                        className="h-16 w-11 rounded object-cover"
                        src={movie.posterUrl}
                      />
                      <span className="font-semibold">{movie.title}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-muted">{movie.languages.join(', ')}</td>
                  <td className="px-5 py-3 text-muted">{formatDate(movie.releaseDate)}</td>
                  <td className="px-5 py-3">
                    <MovieStatusBadge status={movie.status} />
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      <Button onClick={() => setEditing(movie)} size="sm" variant="outline">
                        Edit
                      </Button>
                      {deleteCandidate === movie.id ? (
                        <Button
                          disabled={deleteMutation.isPending}
                          onClick={() => deleteMutation.mutate(movie.id)}
                          size="sm"
                        >
                          Confirm
                        </Button>
                      ) : (
                        <Button
                          onClick={() => setDeleteCandidate(movie.id)}
                          size="sm"
                          variant="ghost"
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
      <Modal
        className="max-h-[92vh] max-w-4xl overflow-y-auto"
        onClose={() => setEditing(undefined)}
        open={editing !== undefined}
        title={editing ? 'Edit movie' : 'Add movie'}
      >
        <MovieForm
          loading={saveMutation.isPending}
          movie={editing}
          onCancel={() => setEditing(undefined)}
          onSubmit={(input) =>
            saveMutation.mutateAsync({ movie: editing ?? null, input }).then(() => undefined)
          }
        />
      </Modal>
    </section>
  );
}

function OrganizerManagement() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const applicationsQuery = useQuery({
    queryKey: ['organizer-applications'],
    queryFn: () => getOrganizerApplications(),
  });
  const reviewMutation = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'approve' | 'reject' }) =>
      reviewOrganizerApplication(id, decision),
    onSuccess: async () => {
      setSelectedId(null);
      await queryClient.invalidateQueries({ queryKey: ['organizer-applications'] });
    },
  });
  const applications = applicationsQuery.data ?? [];
  const selected =
    applications.find((application) => application.id === selectedId) ?? applications[0];

  return (
    <section>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Organizer requests</h1>
        <p className="mt-2 text-sm text-muted">
          Review theater partners and control organizer access.
        </p>
      </div>
      {applicationsQuery.isLoading ? (
        <div className="grid min-h-64 place-items-center">
          <Spinner label="Loading requests" />
        </div>
      ) : null}
      {applicationsQuery.isError ? (
        <p className="mt-6 rounded bg-brand-soft p-4 text-brand">Requests could not be loaded.</p>
      ) : null}
      {!applicationsQuery.isLoading && applications.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-border bg-surface px-6 py-16 text-center">
          <h2 className="text-xl font-bold">No organizer requests</h2>
          <p className="mt-2 text-sm text-muted">New applications will appear here.</p>
        </div>
      ) : null}
      {applications.length > 0 ? (
        <div className="mt-7 grid overflow-hidden rounded-lg border border-border bg-surface lg:grid-cols-[1fr_22rem]">
          <div className="divide-y divide-border">
            {applications.map((application) => (
              <button
                className={
                  selected?.id === application.id
                    ? 'flex w-full items-center justify-between gap-4 bg-brand-soft px-5 py-4 text-left'
                    : 'flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-surface-subtle'
                }
                key={application.id}
                onClick={() => setSelectedId(application.id)}
                type="button"
              >
                <div>
                  <p className="font-semibold">{application.businessName}</p>
                  <p className="mt-1 text-sm text-muted">{application.userEmail}</p>
                </div>
                <ApplicationBadge status={application.status} />
              </button>
            ))}
          </div>
          {selected ? (
            <ApplicationDetail
              application={selected}
              loading={reviewMutation.isPending}
              onReview={(decision) => reviewMutation.mutate({ id: selected.id, decision })}
            />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function ApplicationDetail({
  application,
  loading,
  onReview,
}: {
  application: OrganizerApplication;
  loading: boolean;
  onReview: (decision: 'approve' | 'reject') => void;
}) {
  return (
    <aside className="border-t border-border p-6 lg:border-l lg:border-t-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">{application.businessName}</h2>
          <p className="mt-1 text-sm text-muted">{application.userName}</p>
        </div>
        <ApplicationBadge status={application.status} />
      </div>
      <dl className="mt-7 grid gap-5 text-sm">
        <div>
          <dt className="text-muted">Email</dt>
          <dd className="mt-1 break-all font-medium">{application.userEmail}</dd>
        </div>
        <div>
          <dt className="text-muted">Business phone</dt>
          <dd className="mt-1 font-medium">{application.phone}</dd>
        </div>
        <div>
          <dt className="text-muted">Submitted</dt>
          <dd className="mt-1 font-medium">{new Date(application.createdAt).toLocaleString()}</dd>
        </div>
      </dl>
      {application.status === 'pending' ? (
        <div className="mt-8 grid grid-cols-2 gap-3">
          <Button disabled={loading} onClick={() => onReview('approve')}>
            Approve
          </Button>
          <Button disabled={loading} onClick={() => onReview('reject')} variant="outline">
            Reject
          </Button>
        </div>
      ) : null}
    </aside>
  );
}

function MovieStatusBadge({ status }: { status: Movie['status'] }) {
  return (
    <Badge
      variant={
        status === 'published' ? 'nowShowing' : status === 'draft' ? 'comingSoon' : 'neutral'
      }
    >
      {status}
    </Badge>
  );
}
function ApplicationBadge({ status }: { status: OrganizerApplication['status'] }) {
  return (
    <Badge
      className={status === 'rejected' ? 'bg-brand-soft text-brand' : undefined}
      variant={
        status === 'approved' ? 'nowShowing' : status === 'pending' ? 'comingSoon' : 'neutral'
      }
    >
      {status}
    </Badge>
  );
}
function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
