import { Router } from 'express';

import { requireAuth, requireRole } from '../../middleware/auth.js';
import {
  createAdminMovie,
  deleteAdminMovie,
  getPublicMovie,
  listAdminMovies,
  listPublicMovies,
  listMovieFacets,
  updateAdminMovie,
} from './movie.controller.js';

export const movieRouter = Router();
movieRouter.get('/', listPublicMovies);
movieRouter.get('/facets', listMovieFacets);
movieRouter.get('/:id', getPublicMovie);

export const adminMovieRouter = Router();
adminMovieRouter.use(requireAuth, requireRole('ADMIN'));
adminMovieRouter.get('/', listAdminMovies);
adminMovieRouter.post('/', createAdminMovie);
adminMovieRouter.patch('/:id', updateAdminMovie);
adminMovieRouter.delete('/:id', deleteAdminMovie);
