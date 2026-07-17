import { Skeleton } from '../ui';

export function RouteLoading() {
  return (
    <main className="grid min-h-screen place-items-center bg-surface-dark px-5">
      <div className="w-full max-w-md" aria-label="Loading page">
        <Skeleton className="mx-auto h-10 w-48 bg-brand-contrast/15" />
        <Skeleton className="mt-8 h-80 rounded-xl bg-brand-contrast/10" />
      </div>
    </main>
  );
}
