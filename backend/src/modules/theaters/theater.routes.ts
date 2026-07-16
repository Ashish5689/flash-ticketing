import { Router } from 'express';

import { requireAuth, requireRole } from '../../middleware/auth.js';
import {
  createMyScreen,
  createMyTheater,
  deleteMyScreen,
  deleteMyTheater,
  listMyTheaters,
  updateMyScreen,
  updateMyTheater,
} from './theater.controller.js';

export const theaterRouter = Router();
theaterRouter.use(requireAuth, requireRole('ORGANIZER'));
theaterRouter.get('/theaters', listMyTheaters);
theaterRouter.post('/theaters', createMyTheater);
theaterRouter.patch('/theaters/:id', updateMyTheater);
theaterRouter.delete('/theaters/:id', deleteMyTheater);
theaterRouter.post('/theaters/:theaterId/screens', createMyScreen);
theaterRouter.patch('/screens/:id', updateMyScreen);
theaterRouter.delete('/screens/:id', deleteMyScreen);
