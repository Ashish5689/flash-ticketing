import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { asyncHandler } from "../../shared/asyncHandler";
import type { AuthedRequest } from "../../types";
import { rateLimit } from "../../middleware/rateLimit";
import { releaseHold, reserveSchema, reserveSeat } from "./reservation.service";

export const reservationRoutes = Router();

reservationRoutes.post("/", requireAuth, rateLimit(60, 60), asyncHandler<AuthedRequest>(async (req, res) => {
  res.status(201).json(await reserveSeat(req.user!.id, reserveSchema.parse(req.body)));
}));

reservationRoutes.delete("/:holdId", requireAuth, asyncHandler<AuthedRequest>(async (req, res) => {
  res.json(await releaseHold(String(req.params.holdId), req.user!.id));
}));
