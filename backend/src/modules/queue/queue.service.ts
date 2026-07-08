import { randomUUID } from "crypto";
import { z } from "zod";
import { redis } from "../../config/redis";
import { env } from "../../config/env";
import { badRequest, forbidden } from "../../shared/errors";
import { publishUserEvent } from "../../ws/gateway";
import { parseRedisJson } from "../../shared/redisJson";

const tokenTtlSeconds = 60 * 60;
const expiryTimers = new Map<string, NodeJS.Timeout>();

export const queueTokenSchema = z.object({
  token: z.string().min(16)
});

export function queueKey(eventId: string) {
  return `queue:${eventId}`;
}

export function admittedKey(eventId: string) {
  return `admitted:${eventId}`;
}

export function tokenKey(token: string) {
  return `queue-token:${token}`;
}

export async function joinQueue(eventId: string, userId: string) {
  const token = randomUUID();
  const score = Date.now();
  await redis
    .multi()
    .zadd(queueKey(eventId), score, token)
    .set(tokenKey(token), JSON.stringify({ eventId, userId }), "EX", tokenTtlSeconds)
    .exec();
  const position = await redis.zrank(queueKey(eventId), token);
  const response = { token, position: position === null ? 0 : position + 1, admitted: false };
  scheduleQueueExpiry(eventId, userId, token);
  await publishUserEvent(userId, { type: "queue.position", eventId, token, position: response.position });
  return response;
}

export async function queueStatus(eventId: string, userId: string, token: string) {
  const payload = await readToken(token);
  if (!payload || payload.eventId !== eventId || payload.userId !== userId) {
    throw forbidden("Invalid queue token");
  }
  const admitted = (await redis.sismember(admittedKey(eventId), token)) === 1;
  const rank = await redis.zrank(queueKey(eventId), token);
  return { token, admitted, position: admitted ? 0 : rank === null ? null : rank + 1 };
}

export async function assertAdmitted(eventId: string, userId: string, token: string) {
  const status = await queueStatus(eventId, userId, token);
  if (!status.admitted) throw forbidden("Queue token has not been admitted yet");
}

export async function admitBatchForEvent(eventId: string) {
  const tokens = await redis.zrange(queueKey(eventId), 0, env.QUEUE_ADMIT_BATCH_SIZE - 1);
  if (!tokens.length) return 0;
  const multi = redis.multi();
  for (const token of tokens) {
    multi.sadd(admittedKey(eventId), token);
    cancelQueueExpiry(token);
  }
  multi.expire(admittedKey(eventId), tokenTtlSeconds);
  multi.zrem(queueKey(eventId), ...tokens);
  await multi.exec();

  await Promise.all(
    tokens.map(async (token) => {
      const payload = await readToken(token);
      if (payload) await publishUserEvent(payload.userId, { type: "queue.admitted", eventId, token });
    })
  );
  await publishQueuePositions(eventId);
  return tokens.length;
}

export async function activeQueueEventIds() {
  const keys = await redis.keys("queue:*");
  return keys.map((key) => key.split(":")[1]).filter(Boolean);
}

async function readToken(token: string): Promise<{ eventId: string; userId: string } | null> {
  const raw = await redis.get(tokenKey(token));
  if (!raw) return null;
  try {
    return parseRedisJson(raw);
  } catch {
    throw badRequest("Malformed queue token");
  }
}

async function publishQueuePositions(eventId: string) {
  const tokens = await redis.zrange(queueKey(eventId), 0, -1);
  await Promise.all(
    tokens.map(async (token, index) => {
      const payload = await readToken(token);
      if (!payload) {
        await redis.zrem(queueKey(eventId), token);
        return;
      }
      await publishUserEvent(payload.userId, { type: "queue.position", eventId, token, position: index + 1 });
    })
  );
}

function scheduleQueueExpiry(eventId: string, userId: string, token: string) {
  cancelQueueExpiry(token);
  const timer = setTimeout(() => {
    expiryTimers.delete(token);
    void expireQueueToken(eventId, userId, token);
  }, tokenTtlSeconds * 1000);
  timer.unref();
  expiryTimers.set(token, timer);
}

function cancelQueueExpiry(token: string) {
  const timer = expiryTimers.get(token);
  if (!timer) return;
  clearTimeout(timer);
  expiryTimers.delete(token);
}

async function expireQueueToken(eventId: string, userId: string, token: string) {
  await redis.zrem(queueKey(eventId), token);
  await publishUserEvent(userId, { type: "queue.expired", eventId, token });
  await publishQueuePositions(eventId);
}
