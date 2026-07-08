import { z } from "zod";
import { redis } from "../../config/redis";
import { withTransaction } from "../../config/db";
import { badRequest, conflict } from "../../shared/errors";
import { publishEventAvailability, publishUserEvent } from "../../ws/gateway";
import { deleteHoldAfterConfirm, assertOwnedHold } from "../reservation/reservation.service";
import { findSeatForSale } from "../events/events.repo";
import { chargePayment, verifyPaymentIntent } from "./payment.provider";
import { confirmSeatOrder, findOrderByIdempotencyKey } from "./booking.repo";
import { parseRedisJson } from "../../shared/redisJson";

export const confirmSchema = z.object({
  holdId: z.string().uuid(),
  paymentIntentId: z.string().min(3).optional(),
  paymentMethodId: z.string().min(3).optional()
});

function idemKey(key: string) {
  return `idem:${key}`;
}

export async function confirmBooking(userId: string, idempotencyKey: string | undefined, body: unknown) {
  if (!idempotencyKey) throw badRequest("Idempotency-Key header is required");
  const input = confirmSchema.parse(body);
  const cached = await redis.get(idemKey(idempotencyKey));
  if (cached) return parseRedisJson(cached);

  const hold = await assertOwnedHold(input.holdId, userId);
  const seat = await findSeatForSale(hold.seatId);
  if (!seat) throw badRequest("Seat no longer exists");

  const payment = input.paymentIntentId
    ? await verifyPaymentIntent({
        amountCents: seat.priceCents,
        paymentIntentId: input.paymentIntentId
      })
    : input.paymentMethodId
      ? await chargePayment({
          amountCents: seat.priceCents,
          paymentMethodId: input.paymentMethodId,
          idempotencyKey
        })
      : null;
  if (!payment) throw badRequest("Payment confirmation is required");
  if (payment.status !== "succeeded") throw badRequest("Payment did not succeed");

  const result = await withTransaction(async (client) => {
    const existing = await findOrderByIdempotencyKey(client, idempotencyKey);
    if (existing) return existing;

    const confirmed = await confirmSeatOrder(client, {
      userId,
      eventId: hold.eventId,
      seatId: hold.seatId,
      idempotencyKey,
      providerRef: payment.providerRef,
      paymentStatus: payment.status
    });
    if (!confirmed) throw conflict("Seat is already sold");
    return confirmed;
  });

  const response = {
    ...result,
    ticket: {
      code: `FLASH-${String(result.orderId).slice(0, 8).toUpperCase()}`,
      seatId: result.seatId
    }
  };
  await redis.set(idemKey(idempotencyKey), JSON.stringify(response), "EX", 60 * 60 * 24);
  await deleteHoldAfterConfirm(hold);
  await publishUserEvent(userId, { type: "booking.confirmed", ...response });
  await publishEventAvailability(hold.eventId);
  return response;
}
