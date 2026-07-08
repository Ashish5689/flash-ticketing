import cors from "cors";
import express from "express";
import pinoHttp from "pino-http";
import { authRoutes } from "./modules/auth/auth.routes";
import { eventsRoutes } from "./modules/events/events.routes";
import { queueRoutes } from "./modules/queue/queue.routes";
import { reservationRoutes } from "./modules/reservation/reservation.routes";
import { bookingRoutes } from "./modules/booking/booking.routes";
import { checkoutRoutes } from "./modules/checkout/checkout.routes";
import { ordersRoutes } from "./modules/orders/orders.routes";
import { errorHandler } from "./middleware/error";
import { env } from "./config/env";
import { logger } from "./shared/logger";
import { httpRequestCounter, metricsRegistry } from "./shared/metrics";

export function createApp() {
  const app = express();
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json());
  app.use(pinoHttp({ logger }));
  app.use((req, res, next) => {
    res.on("finish", () => {
      httpRequestCounter.inc({
        method: req.method,
        route: req.route?.path ?? req.path,
        status: String(res.statusCode)
      });
    });
    next();
  });

  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.get("/metrics", async (_req, res) => {
    res.set("Content-Type", metricsRegistry.contentType);
    res.end(await metricsRegistry.metrics());
  });

  app.use("/auth", authRoutes);
  app.use("/events", eventsRoutes);
  app.use("/events/:id/queue", queueRoutes);
  app.use("/reserve", reservationRoutes);
  app.use("/checkout", checkoutRoutes);
  app.use("/confirm", bookingRoutes);
  app.use("/orders", ordersRoutes);
  app.use(errorHandler);

  return app;
}
