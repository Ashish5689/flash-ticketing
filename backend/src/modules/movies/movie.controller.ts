import type { RequestHandler } from 'express';
import { z } from 'zod';

import {
  movieInputSchema,
  movieListQuerySchema,
  movieUpdateSchema,
  publicMovieListQuerySchema,
} from './movie.schemas.js';
import {
  createMovie,
  deleteMovie,
  getMovie,
  listMovies,
  movieFacets,
  updateMovie,
} from './movie.service.js';

const idSchema = z.object({ id: z.uuid() });

export const listPublicMovies: RequestHandler = async (request, response) => {
  const query = publicMovieListQuerySchema.parse(request.query);
  response.status(200).json({ movies: await listMovies(query, true) });
};

export const listMovieFacets: RequestHandler = async (_request, response) => {
  response.status(200).json(await movieFacets());
};

export const getPublicMovie: RequestHandler = async (request, response) => {
  const { id } = idSchema.parse(request.params);
  response.status(200).json({ movie: await getMovie(id, true) });
};

export const listAdminMovies: RequestHandler = async (request, response) => {
  const query = movieListQuerySchema.parse(request.query);
  response.status(200).json({ movies: await listMovies(query, false) });
};

export const createAdminMovie: RequestHandler = async (request, response) => {
  const input = movieInputSchema.parse(request.body);
  const movie = await createMovie(input, request.user!.id);
  response.status(201).json({ movie });
};

export const updateAdminMovie: RequestHandler = async (request, response) => {
  const { id } = idSchema.parse(request.params);
  const movie = await updateMovie(id, movieUpdateSchema.parse(request.body));
  response.status(200).json({ movie });
};

export const deleteAdminMovie: RequestHandler = async (request, response) => {
  const { id } = idSchema.parse(request.params);
  await deleteMovie(id);
  response.status(204).send();
};
