import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { asyncHandler } from "../../shared/asyncHandler";
import type { AuthedRequest } from "../../types";
import {
  addEventSeats,
  addSeatsSchema,
  createEvent,
  createEventSchema,
  getEvent,
  listEvents
} from "./events.service";

export const eventsRoutes = Router();

eventsRoutes.get("/", asyncHandler(async (_req, res) => {
  res.json(await listEvents());
}));

eventsRoutes.get("/:id", asyncHandler(async (req, res) => {
  res.json(await getEvent(String(req.params.id)));
}));

eventsRoutes.post("/", requireAuth, requireRole("organizer"), asyncHandler<AuthedRequest>(async (req, res) => {
  res.status(201).json(await createEvent(req.user!.id, createEventSchema.parse(req.body)));
}));

eventsRoutes.post(
  "/:id/seats",
  requireAuth,
  requireRole("organizer"),
  asyncHandler(async (req, res) => {
    res.status(201).json(await addEventSeats(String(req.params.id), addSeatsSchema.parse(req.body)));
  })
);
