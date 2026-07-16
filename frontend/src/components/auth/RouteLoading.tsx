import { Spinner } from '../ui';

export function RouteLoading() {
  return (
    <main className="grid min-h-screen place-items-center bg-background">
      <Spinner label="Loading page" />
    </main>
  );
}
