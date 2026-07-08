import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { asyncHandler } from "../../shared/asyncHandler";
import type { AuthedRequest } from "../../types";
import { confirmBooking } from "./booking.service";

export const bookingRoutes = Router();

bookingRoutes.post("/", requireAuth, asyncHandler<AuthedRequest>(async (req, res) => {
  res.status(201).json(await confirmBooking(req.user!.id, req.header("Idempotency-Key") ?? undefined, req.body));
}));
