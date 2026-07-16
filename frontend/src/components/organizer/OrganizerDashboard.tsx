import { useQuery } from '@tanstack/react-query';

import { getOrganizerDashboard } from '../../lib/analytics-api';
import { Badge, Card, Spinner } from '../ui';

function money(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value / 100);
}

export function OrganizerDashboard() {
  const dashboard = useQuery({
    queryKey: ['organizer-dashboard'],
    queryFn: getOrganizerDashboard,
    refetchInterval: 15_000,
  });
  if (dashboard.isLoading) {
    return (
      <div className="grid min-h-72 place-items-center">
        <Spinner label="Loading sales dashboard" />
      </div>
    );
  }
  if (dashboard.isError) {
    return (
      <p className="rounded bg-brand-soft p-4 text-brand">Sales dashboard could not be loaded.</p>
    );
  }
  const data = dashboard.data!;
  return (
    <section>
      <div>
        <p className="text-sm font-semibold text-brand">Live operations</p>
        <h1 className="mt-1 text-4xl font-bold tracking-tight">Sales dashboard</h1>
        <p className="mt-3 text-muted">Revenue and seat availability across your shows.</p>
      </div>
      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Revenue" value={money(data.summary.revenueCents)} />
        <Metric label="Tickets sold" value={data.summary.sold} />
        <Metric label="Seats held" value={data.summary.held} />
        <Metric label="Available" value={data.summary.available} />
        <Metric label="Shows" value={data.summary.shows} />
      </div>
      {data.shows.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-border bg-surface px-6 py-14 text-center">
          <h2 className="text-xl font-bold">No show analytics yet</h2>
          <p className="mt-2 text-muted">
            Publish a show to start tracking availability and sales.
          </p>
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full min-w-[52rem] text-left text-sm">
            <thead className="bg-surface-subtle text-muted">
              <tr>
                <th className="px-5 py-3">Show</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Sold</th>
                <th className="px-5 py-3">Held</th>
                <th className="px-5 py-3">Available</th>
                <th className="px-5 py-3">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.shows.map((show) => (
                <tr className="border-t border-border" key={show.id}>
                  <td className="px-5 py-4">
                    <p className="font-semibold">{show.movieTitle}</p>
                    <p className="mt-1 text-xs text-muted">
                      {show.theaterName} · {show.screenName} ·{' '}
                      {new Date(show.startsAt).toLocaleString()}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <Badge variant={show.status === 'onsale' ? 'nowShowing' : 'neutral'}>
                      {show.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-4">{show.sold}</td>
                  <td className="px-5 py-4">{show.held}</td>
                  <td className="px-5 py-4">{show.available}</td>
                  <td className="px-5 py-4 font-semibold">{money(show.revenueCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </Card>
  );
}
