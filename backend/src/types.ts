import type { Request } from "express";

export type Role = "buyer" | "organizer";

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}

export interface AuthedRequest extends Request {
  user?: AuthUser;
}

export interface EventSummary {
  id: string;
  name: string;
  venue: string;
  startsAt: string;
  status: "draft" | "onsale" | "closed";
  soldCount: number;
  totalSeats: number;
  heldCount: number;
}

export interface HoldPayload {
  holdId: string;
  userId: string;
  eventId: string;
  seatId: string;
  expiresAt: string;
}
