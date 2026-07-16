import { create } from 'zustand';

import type { AuthSession, AuthUser } from '../types/auth';

type AuthStatus = 'bootstrapping' | 'authenticated' | 'anonymous';

type AuthState = {
  accessToken: string | null;
  user: AuthUser | null;
  status: AuthStatus;
  setSession: (session: AuthSession) => void;
  clearSession: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  status: 'bootstrapping',
  setSession: ({ accessToken, user }) => set({ accessToken, user, status: 'authenticated' }),
  clearSession: () => set({ accessToken: null, user: null, status: 'anonymous' }),
}));
