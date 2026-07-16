import { useEffect, type PropsWithChildren } from 'react';

import { refreshSession } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

let bootstrapPromise: ReturnType<typeof refreshSession> | null = null;

export function AuthBootstrap({ children }: PropsWithChildren) {
  const status = useAuthStore((state) => state.status);
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);

  useEffect(() => {
    if (status !== 'bootstrapping') return;
    bootstrapPromise ??= refreshSession();
    void bootstrapPromise.then(setSession).catch(clearSession);
  }, [clearSession, setSession, status]);

  return children;
}
