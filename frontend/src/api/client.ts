const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export interface User {
  id: string;
  email: string;
  role: "buyer" | "organizer";
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface ProfileResponse {
  user: User;
}

export interface EventSeat {
  id: string;
  seatLabel: string;
  status: "available" | "sold";
  liveStatus: "available" | "held" | "sold";
  ticketTypeId: string;
  ticketTypeName: string;
  priceCents: number;
}

export interface EventDetail {
  id: string;
  name: string;
  venue: string;
  startsAt: string;
  status: "draft" | "onsale" | "closed";
  seats: EventSeat[];
}

export interface EventSummary {
  id: string;
  name: string;
  venue: string;
  startsAt: string;
  status: "draft" | "onsale" | "closed";
  totalSeats: number;
  soldCount: number;
  heldCount: number;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {})
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(payload.error ?? "Request failed", response.status);
  return payload as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  register: (input: { email: string; name: string; password: string; role: "buyer" | "organizer" }) =>
    request<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify(input) }),
  me: (token: string) => request<ProfileResponse>("/auth/me", {}, token),
  events: () => request<EventSummary[]>("/events"),
  event: (id: string) => request<EventDetail>(`/events/${id}`),
  createEvent: (token: string, input: { name: string; venue: string; startsAt: string; status: string }) =>
    request<EventDetail>("/events", { method: "POST", body: JSON.stringify(input) }, token),
  addSeats: (token: string, eventId: string, input: { ticketTypeName: string; priceCents: number; seatLabels: string[] }) =>
    request(`/events/${eventId}/seats`, { method: "POST", body: JSON.stringify(input) }, token),
  joinQueue: (token: string, eventId: string) =>
    request<{ token: string; position: number; admitted: boolean }>(`/events/${eventId}/queue/join`, { method: "POST" }, token),
  queueStatus: (token: string, eventId: string, queueToken: string) =>
    request<{ token: string; position: number | null; admitted: boolean }>(
      `/events/${eventId}/queue/status?token=${encodeURIComponent(queueToken)}`,
      {},
      token
    ),
  reserve: (token: string, body: { eventId: string; seatId: string; token: string }) =>
    request<{ holdId: string; eventId: string; seatId: string; expiresAt: string }>("/reserve", { method: "POST", body: JSON.stringify(body) }, token),
  confirm: (token: string, body: { holdId: string; paymentMethodId: string }) =>
    request<{ orderId: string; ticket: { code: string; seatId: string } }>(
      "/confirm",
      {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Idempotency-Key": crypto.randomUUID() }
      },
      token
    ),
  order: (token: string, id: string) => request(`/orders/${id}`, {}, token)
};
