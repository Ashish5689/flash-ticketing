import type { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { env } from "../config/env";
import type { AuthedRequest, AuthUser, Role } from "../types";
import { forbidden, unauthorized } from "../shared/errors";
import { upsertExternalUser } from "../modules/auth/auth.repo";

const jwksUrl = env.NEON_AUTH_JWKS_URL ?? (env.NEON_AUTH_BASE_URL ? `${env.NEON_AUTH_BASE_URL}/.well-known/jwks.json` : undefined);
const JWKS = jwksUrl ? createRemoteJWKSet(new URL(jwksUrl)) : null;
const neonIssuer = env.NEON_AUTH_BASE_URL ? new URL(env.NEON_AUTH_BASE_URL).origin : undefined;
const organizerEmails = new Set(
  env.ORGANIZER_EMAILS.split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
);

export function signToken(user: AuthUser): string {
  return jwt.sign(user, env.JWT_SECRET, { expiresIn: "7d" });
}

export async function requireAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    next(unauthorized("Missing bearer token"));
    return;
  }

  try {
    req.user = jwt.verify(token, env.JWT_SECRET) as AuthUser;
    next();
  } catch {
    try {
      req.user = await verifyNeonAuthToken(token);
      next();
    } catch {
      next(unauthorized("Invalid bearer token"));
    }
  }
}

export function requireRole(role: Role) {
  return (req: AuthedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) throw unauthorized();
    if (req.user.role !== role) throw forbidden(`Requires ${role} role`);
    next();
  };
}

async function verifyNeonAuthToken(token: string): Promise<AuthUser> {
  if (!JWKS || !neonIssuer) throw unauthorized("Neon Auth is not configured");
  const { payload } = await jwtVerify(token, JWKS, { issuer: neonIssuer });
  const email = readEmail(payload);
  const name = readName(payload, email);
  const role: Role = organizerEmails.has(email.toLowerCase()) ? "organizer" : "buyer";
  const user = await upsertExternalUser({ email, name, role });
  return { id: user.id, email: user.email, role: user.role };
}

function readEmail(payload: JWTPayload): string {
  const email = payload.email;
  if (typeof email !== "string" || !email) throw unauthorized("Neon token is missing email");
  return email.toLowerCase();
}

function readName(payload: JWTPayload, email: string): string {
  const name = payload.name;
  return typeof name === "string" && name.trim() ? name.trim() : email.split("@")[0];
}
