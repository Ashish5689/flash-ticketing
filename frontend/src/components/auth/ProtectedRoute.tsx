import type { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { Spinner } from '../ui';
import { useAuthStore } from '../../stores/authStore';
import type { UserRole } from '../../types/auth';

type ProtectedRouteProps = PropsWithChildren<{ role?: UserRole }>;

export function ProtectedRoute({ children, role }: ProtectedRouteProps) {
  const location = useLocation();
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);

  if (status === 'bootstrapping') {
    return (
      <main
        className="grid min-h-screen place-items-center bg-background"
        aria-label="Restoring session"
      >
        <Spinner label="Restoring your session" />
      </main>
    );
  }
  if (status === 'anonymous') {
    return <Navigate replace state={{ from: location.pathname }} to="/login" />;
  }
  if (role && user?.role !== role) return <Navigate replace to="/account" />;
  return children;
}
