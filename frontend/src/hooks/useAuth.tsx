import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth as useClerkAuth, useClerk, useUser } from "@clerk/clerk-react";
import { api, type User } from "../api/client";

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  refresh: (options?: { showLoading?: boolean }) => Promise<User | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const clerkAuth = useClerkAuth();
  const clerkUser = useUser();
  const clerk = useClerk();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [syncing, setSyncing] = useState(true);

  const refresh = useCallback(
    async (options: { showLoading?: boolean } = {}) => {
      const showLoading = options.showLoading ?? true;
      if (showLoading) setSyncing(true);
      try {
        if (!clerkAuth.isLoaded || !clerkAuth.isSignedIn) {
          setToken(null);
          setUser(null);
          return null;
        }
        const nextToken = await clerkAuth.getToken();
        if (!nextToken) {
          setToken(null);
          setUser(null);
          return null;
        }
        const profile = await api.me(nextToken);
        setToken(nextToken);
        setUser(profile.user);
        return profile.user;
      } finally {
        if (showLoading) setSyncing(false);
      }
    },
    [clerkAuth.isLoaded, clerkAuth.isSignedIn, clerkAuth.getToken]
  );

  useEffect(() => {
    localStorage.removeItem("flash.token");
    localStorage.removeItem("flash.user");
  }, []);

  useEffect(() => {
    if (!clerkAuth.isLoaded || !clerkUser.isLoaded) return;
    refresh().catch(() => {
      setToken(null);
      setUser(null);
      setSyncing(false);
    });
  }, [clerkAuth.isLoaded, clerkAuth.isSignedIn, clerkUser.isLoaded, clerkUser.user?.id, refresh]);

  useEffect(() => {
    const id = window.setInterval(() => {
      refresh({ showLoading: false }).catch(() => undefined);
    }, 10 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      token,
      loading: !clerkAuth.isLoaded || !clerkUser.isLoaded || syncing,
      refresh,
      logout: async () => {
        await clerk.signOut();
        setUser(null);
        setToken(null);
      }
    }),
    [user, token, clerkAuth.isLoaded, clerkUser.isLoaded, syncing, refresh, clerk]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
