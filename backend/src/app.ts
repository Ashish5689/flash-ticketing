import { randomUUID } from 'node:crypto';

import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';

import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { adminMovieRouter, movieRouter } from './modules/movies/movie.routes.js';
import {
  adminOrganizerRouter,
  organizerApplicationRouter,
} from './modules/organizer/organizer.routes.js';
import { theaterRouter } from './modules/theaters/theater.routes.js';
import {
  movieShowDateRouter,
  movieShowtimeRouter,
  organizerShowRouter,
  showRouter,
} from './modules/shows/show.routes.js';
import { logger } from './shared/logger.js';
import { adminMediaRouter } from './modules/media/media.routes.js';
import { bookingRouter } from './modules/booking/booking.routes.js';
import {
  adminAnalyticsRouter,
  organizerAnalyticsRouter,
} from './modules/analytics/analytics.routes.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(
    pinoHttp({
      logger,
      genReqId: (request, response) => {
        const incomingRequestId = request.headers['x-request-id'];
        const requestId =
          typeof incomingRequestId === 'string' && incomingRequestId.length > 0
            ? incomingRequestId
            : randomUUID();
        response.setHeader('x-request-id', requestId);
        return requestId;
      },
    }),
  );
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.get('/health', (request, response) => {
    response.status(200).json({
      status: 'ok',
      service: 'book-my-show-api',
      environment: env.NODE_ENV,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      requestId: request.id,
    });
  });

  app.use('/auth', authRouter);
  app.use('/movies/:movieId/showtimes', movieShowtimeRouter);
  app.use('/movies/:movieId/show-dates', movieShowDateRouter);
  app.use('/movies', movieRouter);
  app.use('/shows', showRouter);
  app.use('/bookings', bookingRouter);
  app.use(
    '/organizer',
    organizerApplicationRouter,
    theaterRouter,
    organizerShowRouter,
    organizerAnalyticsRouter,
  );
  app.use('/admin', adminAnalyticsRouter);
  app.use('/admin/movies', adminMovieRouter);
  app.use('/admin/media', adminMediaRouter);
  app.use('/admin/organizers', adminOrganizerRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
