import type http from "http";
import { WebSocketServer, WebSocket } from "ws";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import type { AuthUser } from "../types";
import { logger } from "../shared/logger";
import { verifyClerkToken } from "../modules/auth/externalAuth.service";
import { buildEventAvailability } from "../modules/events/availability.service";

const socketsByUser = new Map<string, Set<WebSocket>>();
const socketsByEvent = new Map<string, Set<WebSocket>>();
const eventsBySocket = new WeakMap<WebSocket, Set<string>>();

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
        socket.on("message", (raw) => handleSocketMessage(socket, raw.toString()));
        socket.on("close", () => {
          set.delete(socket);
          if (!set.size) socketsByUser.delete(user.id);
          unsubscribeSocketFromAllEvents(socket);
        });
      })
      .catch(() => socket.close(1008, "Invalid token"));
  });

  return wss;
}

function handleSocketMessage(socket: WebSocket, raw: string) {
  try {
    const message = JSON.parse(raw) as { type?: string; eventId?: string };
    if (!message.eventId) return;
    if (message.type === "subscribe.event") {
      subscribeSocketToEvent(socket, message.eventId);
      void publishEventAvailabilityToSocket(socket, message.eventId);
    }
    if (message.type === "unsubscribe.event") {
      unsubscribeSocketFromEvent(socket, message.eventId);
    }
  } catch {
    socket.send(JSON.stringify({ type: "ws.error", message: "Malformed WebSocket message" }));
  }
}

function subscribeSocketToEvent(socket: WebSocket, eventId: string) {
  const eventSockets = socketsByEvent.get(eventId) ?? new Set<WebSocket>();
  eventSockets.add(socket);
  socketsByEvent.set(eventId, eventSockets);

  const subscribedEvents = eventsBySocket.get(socket) ?? new Set<string>();
  subscribedEvents.add(eventId);
  eventsBySocket.set(socket, subscribedEvents);
}

function unsubscribeSocketFromEvent(socket: WebSocket, eventId: string) {
  const eventSockets = socketsByEvent.get(eventId);
  eventSockets?.delete(socket);
  if (eventSockets && !eventSockets.size) socketsByEvent.delete(eventId);

  const subscribedEvents = eventsBySocket.get(socket);
  subscribedEvents?.delete(eventId);
}

function unsubscribeSocketFromAllEvents(socket: WebSocket) {
  const subscribedEvents = eventsBySocket.get(socket);
  if (!subscribedEvents) return;
  for (const eventId of subscribedEvents) unsubscribeSocketFromEvent(socket, eventId);
}

async function resolveSocketUser(token: string): Promise<AuthUser> {
  try {
    return jwt.verify(token, env.JWT_SECRET) as AuthUser;
  } catch {
    return verifyClerkToken(token);
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

export async function publishEventAvailability(eventId: string) {
  const sockets = socketsByEvent.get(eventId);
  if (!sockets?.size) return;
  const snapshot = await buildEventAvailability(eventId);
  publishEventEvent(eventId, { type: "event.availability", eventId, ...snapshot });
}

async function publishEventAvailabilityToSocket(socket: WebSocket, eventId: string) {
  if (socket.readyState !== WebSocket.OPEN) return;
  const snapshot = await buildEventAvailability(eventId);
  socket.send(JSON.stringify({ type: "event.availability", eventId, ...snapshot }));
}

export function publishEventEvent(eventId: string, event: Record<string, unknown>) {
  const sockets = socketsByEvent.get(eventId);
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
  socketsByEvent.clear();
  logger.info("Closed WebSocket connections");
}
