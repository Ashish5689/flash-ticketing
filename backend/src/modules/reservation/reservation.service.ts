import { randomUUID } from "crypto";
import { z } from "zod";
import { redis } from "../../config/redis";
import { env } from "../../config/env";
import { badRequest, conflict, forbidden, notFound } from "../../shared/errors";
import type { HoldPayload } from "../../types";
import { findSeatForSale } from "../events/events.repo";
import { assertAdmitted } from "../queue/queue.service";
import { publishUserEvent } from "../../ws/gateway";
import { parseRedisJson } from "../../shared/redisJson";

export const reserveSchema = z.object({
  eventId: z.string().uuid(),
  seatId: z.string().uuid(),
  token: z.string().min(16)
});

function holdKey(eventId: string, seatId: string) {
  return `hold:${eventId}:${seatId}`;
}

function holdIdKey(holdId: string) {
  return `hold-id:${holdId}`;
}

export async function reserveSeat(userId: string, input: z.infer<typeof reserveSchema>) {
  await assertAdmitted(input.eventId, userId, input.token);
  const seat = await findSeatForSale(input.seatId);
  if (!seat || seat.eventId !== input.eventId) throw notFound("Seat not found");
  if (seat.status === "sold") throw conflict("Seat is already sold");

  const holdId = randomUUID();
  const expiresAt = new Date(Date.now() + env.HOLD_TTL_SECONDS * 1000).toISOString();
  const payload: HoldPayload = { holdId, userId, eventId: input.eventId, seatId: input.seatId, expiresAt };
  const key = holdKey(input.eventId, input.seatId);
  const ok = await redis.set(key, JSON.stringify(payload), "EX", env.HOLD_TTL_SECONDS, "NX");
  if (ok !== "OK") throw conflict("Seat is already held");

  await redis.set(holdIdKey(holdId), key, "EX", env.HOLD_TTL_SECONDS);
  await publishUserEvent(userId, { type: "hold.created", ...payload });
  return payload;
}

export async function readHold(holdId: string): Promise<HoldPayload | null> {
  const key = await redis.get(holdIdKey(holdId));
  if (!key) return null;
  const raw = await redis.get(String(key));
  if (!raw) return null;
  return parseRedisJson<HoldPayload>(raw);
}

export async function assertOwnedHold(holdId: string, userId: string): Promise<HoldPayload> {
  const hold = await readHold(holdId);
  if (!hold) throw badRequest("Hold has expired or does not exist");
  if (hold.userId !== userId) throw forbidden("Hold belongs to another user");
  return hold;
}

export async function releaseHold(holdId: string, userId: string) {
  const hold = await assertOwnedHold(holdId, userId);
  const key = holdKey(hold.eventId, hold.seatId);
  const script = `
    if redis.call("GET", KEYS[1]) == ARGV[1] then
      redis.call("DEL", KEYS[1])
      redis.call("DEL", KEYS[2])
      return 1
    end
    return 0
  `;
  const deleted = await redis.eval(script, 2, key, holdIdKey(holdId), JSON.stringify(hold));
  if (deleted !== 1) throw conflict("Hold could not be released");
  await publishUserEvent(userId, { type: "hold.released", holdId });
  return { released: true };
}

export async function deleteHoldAfterConfirm(hold: HoldPayload) {
  await redis.del(holdKey(hold.eventId, hold.seatId), holdIdKey(hold.holdId));
}
