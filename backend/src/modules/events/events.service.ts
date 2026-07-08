import { z } from "zod";
import { withTransaction } from "../../config/db";
import { badRequest } from "../../shared/errors";
import * as repo from "./events.repo";
import { buildEventAvailability, heldSeatIds } from "./availability.service";
import { publishEventAvailability } from "../../ws/gateway";

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
  return buildEventAvailability(id);
}

export async function createEvent(organizerId: string, input: z.infer<typeof createEventSchema>) {
  return repo.createEvent({ organizerId, ...input });
}

export async function addEventSeats(eventId: string, input: z.infer<typeof addSeatsSchema>) {
  const duplicates = new Set(input.seatLabels);
  if (duplicates.size !== input.seatLabels.length) throw badRequest("Seat labels must be unique");
  const ticketType = await withTransaction((client) => repo.addSeats(client, { eventId, ...input }));
  await publishEventAvailability(eventId);
  return ticketType;
}
