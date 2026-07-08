import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { asyncHandler } from "../../shared/asyncHandler";
import type { AuthedRequest } from "../../types";
import { login, loginSchema, register, registerSchema } from "./auth.service";

export const authRoutes = Router();

authRoutes.post("/register", asyncHandler(async (req, res) => {
  res.status(201).json(await register(registerSchema.parse(req.body)));
}));

authRoutes.post("/login", asyncHandler(async (req, res) => {
  res.json(await login(loginSchema.parse(req.body)));
}));

authRoutes.get("/me", requireAuth, asyncHandler<AuthedRequest>(async (req, res) => {
  res.json({ user: req.user });
}));
