import type { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import type { AuthedRequest, AuthUser, Role } from "../types";
import { forbidden, unauthorized } from "../shared/errors";
import { verifyClerkToken } from "../modules/auth/externalAuth.service";

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
      req.user = await verifyClerkToken(token);
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
