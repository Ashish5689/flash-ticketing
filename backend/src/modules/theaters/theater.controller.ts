import type { RequestHandler } from 'express';
import { z } from 'zod';

import {
  screenInputSchema,
  screenUpdateSchema,
  theaterInputSchema,
  theaterUpdateSchema,
} from './theater.schemas.js';
import {
  createScreen,
  createTheater,
  deleteScreen,
  deleteTheater,
  listOrganizerTheaters,
  updateScreen,
  updateTheater,
} from './theater.service.js';

const idSchema = z.object({ id: z.uuid() });
const theaterIdSchema = z.object({ theaterId: z.uuid() });

export const listMyTheaters: RequestHandler = async (request, response) => {
  response.status(200).json({ theaters: await listOrganizerTheaters(request.user!.id) });
};

export const createMyTheater: RequestHandler = async (request, response) => {
  const theater = await createTheater(request.user!.id, theaterInputSchema.parse(request.body));
  response.status(201).json({ theater });
};

export const updateMyTheater: RequestHandler = async (request, response) => {
  const { id } = idSchema.parse(request.params);
  const theater = await updateTheater(
    id,
    request.user!.id,
    theaterUpdateSchema.parse(request.body),
  );
  response.status(200).json({ theater });
};

export const deleteMyTheater: RequestHandler = async (request, response) => {
  const { id } = idSchema.parse(request.params);
  await deleteTheater(id, request.user!.id);
  response.status(204).send();
};

export const createMyScreen: RequestHandler = async (request, response) => {
  const { theaterId } = theaterIdSchema.parse(request.params);
  const screen = await createScreen(
    theaterId,
    request.user!.id,
    screenInputSchema.parse(request.body),
  );
  response.status(201).json({ screen });
};

export const updateMyScreen: RequestHandler = async (request, response) => {
  const { id } = idSchema.parse(request.params);
  const screen = await updateScreen(id, request.user!.id, screenUpdateSchema.parse(request.body));
  response.status(200).json({ screen });
};

export const deleteMyScreen: RequestHandler = async (request, response) => {
  const { id } = idSchema.parse(request.params);
  await deleteScreen(id, request.user!.id);
  response.status(204).send();
};
