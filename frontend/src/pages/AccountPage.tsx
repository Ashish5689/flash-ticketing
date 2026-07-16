import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Footer, Navbar } from '../components/layout';
import { Badge, Card, Modal } from '../components/ui';
import { useAuthStore } from '../stores/authStore';

export default function AccountPage() {
  const user = useAuthStore((state) => state.user);
  const [cityOpen, setCityOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar onCityClick={() => setCityOpen(true)} />
      <main className="mx-auto w-full max-w-content flex-1 px-5 py-10 sm:px-8">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-brand">My account</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Hi, {user?.name}</h1>
            <p className="mt-2 text-muted">Manage your profile and open your ticket history.</p>
          </div>
          <Badge variant="nowShowing">{user?.role ?? 'USER'}</Badge>
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <h2 className="text-lg font-bold">Your movie tickets</h2>
            <div className="mt-6 rounded-lg border border-dashed border-border bg-surface-subtle px-6 py-10 text-center">
              <TicketIcon />
              <p className="mt-4 font-semibold">Booking history</p>
              <p className="mt-1 text-sm text-muted">
                Open confirmed tickets and their entrance QR codes.
              </p>
              <Link
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded border border-brand bg-brand px-5 text-sm font-semibold text-brand-contrast hover:bg-brand-hover"
                to="/bookings"
              >
                View my bookings
              </Link>
            </div>
          </Card>
          <Card>
            <h2 className="text-lg font-bold">Profile</h2>
            <dl className="mt-5 grid gap-4 text-sm">
              <div>
                <dt className="text-muted">Name</dt>
                <dd className="mt-1 font-medium">{user?.name}</dd>
              </div>
              <div>
                <dt className="text-muted">Email</dt>
                <dd className="mt-1 break-all font-medium">{user?.email}</dd>
              </div>
              <div>
                <dt className="text-muted">Account type</dt>
                <dd className="mt-1 font-medium">{user?.role}</dd>
              </div>
            </dl>
            {user?.role === 'USER' ? (
              <Link
                className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded border border-brand bg-surface px-4 text-sm font-semibold text-brand hover:bg-brand-soft"
                to="/organizer/apply"
              >
                Become an organizer
              </Link>
            ) : null}
            {user?.role === 'ORGANIZER' ? (
              <Link
                className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded border border-brand bg-brand px-4 text-sm font-semibold text-brand-contrast hover:bg-brand-hover"
                to="/organizer"
              >
                Open theater workspace
              </Link>
            ) : null}
            {user?.role === 'ADMIN' ? (
              <Link
                className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded border border-brand bg-brand px-4 text-sm font-semibold text-brand-contrast hover:bg-brand-hover"
                to="/admin"
              >
                Open admin workspace
              </Link>
            ) : null}
          </Card>
        </div>
      </main>
      <Footer />
      <Modal
        description="City discovery is wired for the catalog phase."
        onClose={() => setCityOpen(false)}
        open={cityOpen}
        title="Mumbai selected"
      >
        <p className="text-sm text-muted">You’ll see nearby cinemas and events here in Phase 2.</p>
      </Modal>
    </div>
  );
}

function TicketIcon() {
  return (
    <svg aria-hidden="true" className="mx-auto size-10 text-brand" fill="none" viewBox="0 0 24 24">
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
