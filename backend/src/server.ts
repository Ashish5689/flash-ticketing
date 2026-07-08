import http from "http";
import { createApp } from "./app";
import { env } from "./config/env";
import { pool } from "./config/db";
import { redis } from "./config/redis";
import { logger } from "./shared/logger";
import { attachWebSocket, closeAllSockets } from "./ws/gateway";
import { startAdmissionWorker, stopAdmissionWorker } from "./modules/queue/admission.worker";

const app = createApp();
const server = http.createServer(app);
attachWebSocket(server);
startAdmissionWorker();

server.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "Flash ticketing API listening");
});

async function shutdown() {
  logger.info("Shutting down");
  stopAdmissionWorker();
  closeAllSockets();
  server.close(async () => {
    await Promise.allSettled([pool.end(), redis.quit()]);
    process.exit(0);
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
