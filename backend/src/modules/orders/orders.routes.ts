import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { asyncHandler } from "../../shared/asyncHandler";
import type { AuthedRequest } from "../../types";
import { getOrder } from "./orders.service";

export const ordersRoutes = Router();

ordersRoutes.get("/:id", requireAuth, asyncHandler<AuthedRequest>(async (req, res) => {
  res.json(await getOrder(req.user!.id, String(req.params.id)));
}));
