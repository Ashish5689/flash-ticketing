import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, type User } from "../api/client";
import { authClient } from "../auth";

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  refresh: (options?: { showLoading?: boolean; fresh?: boolean }) => Promise<User | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (options: { showLoading?: boolean; fresh?: boolean } = {}) => {
    const showLoading = options.showLoading ?? true;
    if (showLoading) setLoading(true);
    try {
      const session = await authClient.getSession(
        options.fresh ? { query: { disableCookieCache: true } } : undefined
      );
      if (!session.data?.session) {
        setToken(null);
        setUser(null);
        return null;
      }
      const tokenResult = await authClient.token();
      const nextToken = tokenResult.data?.token;
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
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    localStorage.removeItem("flash.token");
    localStorage.removeItem("flash.user");
    const isAuthCallback = window.location.hash === "#auth-callback" || window.location.pathname === "/auth/callback";
    refresh({ fresh: isAuthCallback }).catch(() => {
      setToken(null);
      setUser(null);
      setLoading(false);
    });
  }, [refresh]);

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
      loading,
      refresh,
      logout: async () => {
        await authClient.signOut();
        setUser(null);
        setToken(null);
      }
    }),
    [user, token, loading, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
