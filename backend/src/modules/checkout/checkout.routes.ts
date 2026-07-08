import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { asyncHandler } from "../../shared/asyncHandler";
import type { AuthedRequest } from "../../types";
import { createCheckoutIntent, createCheckoutIntentSchema } from "./checkout.service";

export const checkoutRoutes = Router();

checkoutRoutes.post("/payment-intent", requireAuth, asyncHandler<AuthedRequest>(async (req, res) => {
  res.status(201).json(await createCheckoutIntent(req.user!.id, createCheckoutIntentSchema.parse(req.body)));
}));
