import { redis } from "../../config/redis";
import { notFound } from "../../shared/errors";
import * as repo from "./events.repo";

export interface AvailabilitySeat {
  id: string;
  seatLabel: string;
  status: "available" | "sold";
  liveStatus: "available" | "held" | "sold";
  ticketTypeId: string;
  ticketTypeName: string;
  priceCents: number;
}

export interface EventAvailabilitySnapshot {
  id: string;
  name: string;
  venue: string;
  startsAt: string;
  status: "draft" | "onsale" | "closed";
  seats: AvailabilitySeat[];
  totalSeats: number;
  soldCount: number;
  heldCount: number;
  availableCount: number;
}

export async function heldSeatIds(eventId: string): Promise<Set<string>> {
  const keys = await redis.keys(`hold:${eventId}:*`);
  if (!keys.length) return new Set();
  return new Set(keys.map((key) => key.split(":").at(-1) as string));
}

export async function buildEventAvailability(eventId: string): Promise<EventAvailabilitySnapshot> {
  const event = await repo.getEvent(eventId);
  if (!event) throw notFound("Event not found");

  const held = await heldSeatIds(eventId);
  const seats = event.seats.map((seat: AvailabilitySeat) => ({
    ...seat,
    liveStatus: seat.status === "sold" ? "sold" : held.has(seat.id) ? "held" : "available"
  }));
  const soldCount = seats.filter((seat: AvailabilitySeat) => seat.liveStatus === "sold").length;
  const heldCount = seats.filter((seat: AvailabilitySeat) => seat.liveStatus === "held").length;
  const availableCount = seats.filter((seat: AvailabilitySeat) => seat.liveStatus === "available").length;

  return {
    ...event,
    seats,
    totalSeats: seats.length,
    soldCount,
    heldCount,
    availableCount
  };
}
