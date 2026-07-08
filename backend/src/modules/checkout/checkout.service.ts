import { z } from "zod";
import { assertOwnedHold } from "../reservation/reservation.service";
import { findSeatForSale } from "../events/events.repo";
import { badRequest } from "../../shared/errors";
import { createPaymentIntent } from "../booking/payment.provider";

export const createCheckoutIntentSchema = z.object({
  holdId: z.string().uuid()
});

export async function createCheckoutIntent(userId: string, input: z.infer<typeof createCheckoutIntentSchema>) {
  const hold = await assertOwnedHold(input.holdId, userId);
  const seat = await findSeatForSale(hold.seatId);
  if (!seat) throw badRequest("Seat no longer exists");
  if (seat.status === "sold") throw badRequest("Seat is already sold");
  return createPaymentIntent({ amountCents: seat.priceCents, holdId: hold.holdId });
}
