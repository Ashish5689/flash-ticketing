import { z } from "zod";
import { redis } from "../../config/redis";
import { withTransaction } from "../../config/db";
import { badRequest, notFound } from "../../shared/errors";
import * as repo from "./events.repo";

export const createEventSchema = z.object({
  name: z.string().min(3),
  venue: z.string().min(2),
  startsAt: z.string().datetime(),
  status: z.enum(["draft", "onsale", "closed"]).default("draft")
});

export const addSeatsSchema = z.object({
  ticketTypeName: z.string().min(2),
  priceCents: z.number().int().nonnegative(),
  seatLabels: z.array(z.string().min(1)).min(1).max(500)
});

async function heldSeatIds(eventId: string): Promise<Set<string>> {
  const keys = await redis.keys(`hold:${eventId}:*`);
  if (!keys.length) return new Set();
  return new Set(keys.map((key) => key.split(":").at(-1) as string));
}

export async function listEvents() {
  const rows = await repo.listEvents();
  return Promise.all(
    rows.map(async (event) => ({
      ...event,
      heldCount: (await heldSeatIds(event.id)).size
    }))
  );
}

export async function getEvent(id: string) {
  const event = await repo.getEvent(id);
  if (!event) throw notFound("Event not found");
  const held = await heldSeatIds(id);
  return {
    ...event,
    seats: event.seats.map((seat: any) => ({
      ...seat,
      liveStatus: seat.status === "sold" ? "sold" : held.has(seat.id) ? "held" : "available"
    }))
  };
}

export async function createEvent(organizerId: string, input: z.infer<typeof createEventSchema>) {
  return repo.createEvent({ organizerId, ...input });
}

export async function addEventSeats(eventId: string, input: z.infer<typeof addSeatsSchema>) {
  const duplicates = new Set(input.seatLabels);
  if (duplicates.size !== input.seatLabels.length) throw badRequest("Seat labels must be unique");
  return withTransaction((client) => repo.addSeats(client, { eventId, ...input }));
}
