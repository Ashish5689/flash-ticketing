import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { asyncHandler } from "../../shared/asyncHandler";
import type { AuthedRequest } from "../../types";
import { joinQueue, queueStatus, queueTokenSchema } from "./queue.service";

export const queueRoutes = Router({ mergeParams: true });

queueRoutes.post("/join", requireAuth, asyncHandler<AuthedRequest>(async (req, res) => {
  res.status(201).json(await joinQueue(String(req.params.id), req.user!.id));
}));

queueRoutes.get("/status", requireAuth, asyncHandler<AuthedRequest>(async (req, res) => {
  const { token } = queueTokenSchema.parse(req.query);
  res.json(await queueStatus(String(req.params.id), req.user!.id, token));
}));
