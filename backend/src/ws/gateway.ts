import type http from "http";
import { WebSocketServer, WebSocket } from "ws";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import type { AuthUser } from "../types";
import { logger } from "../shared/logger";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { upsertExternalUser } from "../modules/auth/auth.repo";

const jwksUrl = env.NEON_AUTH_JWKS_URL ?? (env.NEON_AUTH_BASE_URL ? `${env.NEON_AUTH_BASE_URL}/.well-known/jwks.json` : undefined);
const JWKS = jwksUrl ? createRemoteJWKSet(new URL(jwksUrl)) : null;
const neonIssuer = env.NEON_AUTH_BASE_URL ? new URL(env.NEON_AUTH_BASE_URL).origin : undefined;
const organizerEmails = new Set(env.ORGANIZER_EMAILS.split(",").map((email) => email.trim().toLowerCase()).filter(Boolean));

const socketsByUser = new Map<string, Set<WebSocket>>();

export function attachWebSocket(server: http.Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (socket, req) => {
    const url = new URL(req.url ?? "", `http://${req.headers.host}`);
    const token = url.searchParams.get("token");
    if (!token) {
      socket.close(1008, "Missing token");
      return;
    }

    resolveSocketUser(token)
      .then((user) => {
      const set = socketsByUser.get(user.id) ?? new Set<WebSocket>();
      set.add(socket);
      socketsByUser.set(user.id, set);
      socket.send(JSON.stringify({ type: "ws.connected" }));
      socket.on("close", () => {
        set.delete(socket);
        if (!set.size) socketsByUser.delete(user.id);
      });
      })
      .catch(() => socket.close(1008, "Invalid token"));
  });

  return wss;
}

async function resolveSocketUser(token: string): Promise<AuthUser> {
  try {
    return jwt.verify(token, env.JWT_SECRET) as AuthUser;
  } catch {
    if (!JWKS || !neonIssuer) throw new Error("Neon Auth is not configured");
    const { payload } = await jwtVerify(token, JWKS, { issuer: neonIssuer });
    const email = typeof payload.email === "string" ? payload.email.toLowerCase() : "";
    if (!email) throw new Error("Missing email");
    const name = typeof payload.name === "string" && payload.name.trim() ? payload.name.trim() : email.split("@")[0];
    const neonRole = typeof payload.role === "string" ? payload.role.toLowerCase() : "";
    const role = organizerEmails.has(email) || neonRole === "admin" || neonRole === "organizer" ? "organizer" : "buyer";
    const user = await upsertExternalUser({ email, name, role });
    return { id: user.id, email: user.email, role: user.role };
  }
}

export async function publishUserEvent(userId: string, event: Record<string, unknown>) {
  const sockets = socketsByUser.get(userId);
  if (!sockets?.size) return;
  const payload = JSON.stringify(event);
  for (const socket of sockets) {
    if (socket.readyState === WebSocket.OPEN) socket.send(payload);
  }
}

export function closeAllSockets() {
  for (const sockets of socketsByUser.values()) {
    for (const socket of sockets) socket.close(1001, "Server shutting down");
  }
  socketsByUser.clear();
  logger.info("Closed WebSocket connections");
}
