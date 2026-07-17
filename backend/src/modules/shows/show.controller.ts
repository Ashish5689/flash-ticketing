import type { RequestHandler } from 'express';
import { z } from 'zod';

import {
  organizerShowQuerySchema,
  showDateQuerySchema,
  showInputSchema,
  showStatusUpdateSchema,
  showtimeQuerySchema,
} from './show.schemas.js';
import {
  cancelShow,
  createShow,
  getPublicShow,
  getShowSeatMap,
  listMovieShowtimes,
  listMovieShowDates,
  listOrganizerShows,
  listShowCities,
  publishShow,
} from './show.service.js';

const idSchema = z.object({ id: z.uuid() });
const movieIdSchema = z.object({ movieId: z.uuid() });

export const createMyShow: RequestHandler = async (request, response) => {
  const show = await createShow(request.user!.id, showInputSchema.parse(request.body));
  response.status(201).json({ show });
};

export const listMyShows: RequestHandler = async (request, response) => {
  response.status(200).json({
    shows: await listOrganizerShows(
      request.user!.id,
      organizerShowQuerySchema.parse(request.query),
    ),
  });
};

export const publishMyShow: RequestHandler = async (request, response) => {
  const { id } = idSchema.parse(request.params);
  response.status(200).json({ show: await publishShow(id, request.user!.id) });
};

export const updateMyShowStatus: RequestHandler = async (request, response) => {
  const { id } = idSchema.parse(request.params);
  showStatusUpdateSchema.parse(request.body);
  response.status(200).json({ show: await cancelShow(id, request.user!.id) });
};

export const listPublicMovieShowtimes: RequestHandler = async (request, response) => {
  const { movieId } = movieIdSchema.parse(request.params);
  response
    .status(200)
    .json(await listMovieShowtimes(movieId, showtimeQuerySchema.parse(request.query)));
};

export const listPublicMovieShowDates: RequestHandler = async (request, response) => {
  const { movieId } = movieIdSchema.parse(request.params);
  response
    .status(200)
    .json(await listMovieShowDates(movieId, showDateQuerySchema.parse(request.query)));
};

export const listPublicShowCities: RequestHandler = async (_request, response) => {
  response.status(200).json({ cities: await listShowCities() });
};

export const getPublicShowDetails: RequestHandler = async (request, response) => {
  const { id } = idSchema.parse(request.params);
  response.status(200).json({ show: await getPublicShow(id) });
};

export const getPublicShowSeats: RequestHandler = async (request, response) => {
  const { id } = idSchema.parse(request.params);
  response.status(200).json(await getShowSeatMap(id));
};
