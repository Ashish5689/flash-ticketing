import { useAuthStore } from '../stores/authStore';
import type { AuthSession } from '../types/auth';

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

type ApiErrorBody = { error?: { code?: string; message?: string } };

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.ok) return (response.status === 204 ? undefined : response.json()) as Promise<T>;
  const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
  throw new ApiError(
    response.status,
    body.error?.message ?? 'Something went wrong. Please try again.',
    body.error?.code,
  );
}

async function rawRequest<T>(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData))
    headers.set('content-type', 'application/json');
  return parseResponse<T>(
    await fetch(`${apiUrl}${path}`, { ...init, headers, credentials: 'include' }),
  );
}

let refreshPromise: Promise<AuthSession> | null = null;

export function refreshSession() {
  refreshPromise ??= rawRequest<AuthSession>('/auth/refresh', { method: 'POST' }).finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

export function exchangeFirebaseToken(idToken: string) {
  return rawRequest<AuthSession>('/auth/firebase', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
  });
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<T> {
  const token = useAuthStore.getState().accessToken;
  const headers = new Headers(init.headers);
  if (token) headers.set('authorization', `Bearer ${token}`);

  try {
    return await rawRequest<T>(path, { ...init, headers });
  } catch (error) {
    if (retry && error instanceof ApiError && error.status === 401) {
      try {
        const session = await refreshSession();
        useAuthStore.getState().setSession(session);
        return apiRequest<T>(path, init, false);
      } catch (refreshError) {
        useAuthStore.getState().clearSession();
        throw refreshError;
      }
    }
    throw error;
  }
}

export function logoutSession() {
  return rawRequest<void>('/auth/logout', { method: 'POST' });
}
