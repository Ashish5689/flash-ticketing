import type { ErrorRequestHandler, RequestHandler } from 'express';
import { DatabaseError } from 'pg';
import multer from 'multer';
import { ZodError } from 'zod';

import { env } from '../config/env.js';
import { AppError } from '../shared/errors.js';
import { logger } from '../shared/logger.js';

export const notFoundHandler: RequestHandler = (request, _response, next) => {
  next(new AppError(404, 'ROUTE_NOT_FOUND', `Route ${request.method} ${request.path} not found`));
};

export const errorHandler: ErrorRequestHandler = (error: unknown, request, response, _next) => {
  if (error instanceof multer.MulterError) {
    response.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({
      error: {
        code: error.code === 'LIMIT_FILE_SIZE' ? 'IMAGE_TOO_LARGE' : 'UPLOAD_ERROR',
        message:
          error.code === 'LIMIT_FILE_SIZE'
            ? 'Images must be 10 MB or smaller'
            : 'The image upload could not be processed',
        requestId: request.id,
      },
    });
    return;
  }

  if (error instanceof ZodError) {
    response.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: error.flatten(),
        requestId: request.id,
      },
    });
    return;
  }

  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        requestId: request.id,
      },
    });
    return;
  }

  if (error instanceof DatabaseError && error.code === '23505') {
    response.status(409).json({
      error: {
        code: 'RESOURCE_CONFLICT',
        message: 'A record with these unique details already exists',
        requestId: request.id,
      },
    });
    return;
  }

  if (error instanceof DatabaseError && error.code === '23503') {
    response.status(409).json({
      error: {
        code: 'RESOURCE_IN_USE',
        message: 'This record is still referenced by another resource',
        requestId: request.id,
      },
    });
    return;
  }

  logger.error({ err: error, requestId: request.id }, 'Unhandled request error');
  response.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: env.NODE_ENV === 'production' ? 'An unexpected error occurred' : String(error),
      requestId: request.id,
    },
  });
};
