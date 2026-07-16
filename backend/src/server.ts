import { createServer } from 'node:http';

import { createApp } from './app.js';
import { pool } from './config/db.js';
import { env } from './config/env.js';
import { redis } from './config/redis.js';
import { logger } from './shared/logger.js';

const app = createApp();
const server = createServer(app);

server.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'API listening');
});

async function shutdown(signal: NodeJS.Signals) {
  logger.info({ signal }, 'Graceful shutdown started');

  server.close(async (error) => {
    if (error) {
      logger.error({ err: error }, 'HTTP server failed to close');
      process.exitCode = 1;
    }

    await pool.end();
    if (redis.status !== 'wait' && redis.status !== 'end') {
      redis.disconnect();
    }

    logger.info('Graceful shutdown complete');
    process.exit();
  });
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
