import bcrypt from "bcryptjs";
import { z } from "zod";
import { badRequest, unauthorized } from "../../shared/errors";
import { signToken } from "../../middleware/auth";
import { createUser, findUserByEmail } from "./auth.repo";
import type { Role } from "../../types";

export const registerSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase()),
  name: z.string().min(2),
  password: z.string().min(8),
  role: z.enum(["buyer", "organizer"]).default("buyer")
});

export const loginSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase()),
  password: z.string().min(1)
});

export async function register(input: z.infer<typeof registerSchema>) {
  const existing = await findUserByEmail(input.email);
  if (existing) throw badRequest("Email is already registered");

  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await createUser({
    email: input.email,
    name: input.name,
    role: input.role as Role,
    passwordHash
  });
  const authUser = { id: user.id, email: user.email, role: user.role };
  return { user: authUser, token: signToken(authUser) };
}

export async function login(input: z.infer<typeof loginSchema>) {
  const user = await findUserByEmail(input.email);
  if (!user) throw unauthorized("Invalid credentials");
  const ok = await bcrypt.compare(input.password, user.password_hash);
  if (!ok) throw unauthorized("Invalid credentials");
  const authUser = { id: user.id, email: user.email, role: user.role };
  return { user: authUser, token: signToken(authUser) };
}
