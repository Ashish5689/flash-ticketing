import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, type User } from "../api/client";
import { authClient } from "../auth";

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  refresh: (showLoading?: boolean) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh(showLoading = true) {
    if (showLoading) setLoading(true);
    try {
      const session = await authClient.getSession();
      if (!session.data?.session) {
        setToken(null);
        setUser(null);
        return;
      }
      const tokenResult = await authClient.token();
      const nextToken = tokenResult.data?.token;
      if (!nextToken) {
        setToken(null);
        setUser(null);
        return;
      }
      const profile = await api.me(nextToken);
      setToken(nextToken);
      setUser(profile.user);
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  useEffect(() => {
    localStorage.removeItem("flash.token");
    localStorage.removeItem("flash.user");
    refresh().catch(() => {
      setToken(null);
      setUser(null);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      refresh(false).catch(() => undefined);
    }, 10 * 60 * 1000);
    return () => window.clearInterval(id);
  }, []);

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
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
