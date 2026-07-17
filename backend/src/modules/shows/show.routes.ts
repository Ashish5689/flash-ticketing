import { Router } from 'express';

import { requireAuth, requireRole } from '../../middleware/auth.js';
import {
  createMyShow,
  getPublicShowDetails,
  getPublicShowSeats,
  listMyShows,
  listPublicMovieShowtimes,
  listPublicMovieShowDates,
  listPublicShowCities,
  publishMyShow,
  updateMyShowStatus,
} from './show.controller.js';

export const organizerShowRouter = Router();
organizerShowRouter.use(requireAuth, requireRole('ORGANIZER'));
organizerShowRouter.get('/shows', listMyShows);
organizerShowRouter.post('/shows', createMyShow);
organizerShowRouter.post('/shows/:id/publish', publishMyShow);
organizerShowRouter.patch('/shows/:id', updateMyShowStatus);

export const showRouter = Router();
showRouter.get('/cities', listPublicShowCities);
showRouter.get('/:id', getPublicShowDetails);
showRouter.get('/:id/seats', getPublicShowSeats);

export const movieShowtimeRouter = Router({ mergeParams: true });
movieShowtimeRouter.get('/', listPublicMovieShowtimes);

export const movieShowDateRouter = Router({ mergeParams: true });
movieShowDateRouter.get('/', listPublicMovieShowDates);
