import type { RequestHandler } from 'express';

import { AppError } from '../../shared/errors.js';
import { deleteImageSchema, importImageSchema, mediaKindSchema } from './media.schemas.js';
import {
  deleteManagedAsset,
  importRemoteImage,
  isMediaAttached,
  uploadCroppedImage,
} from './media.service.js';

export const uploadAdminImage: RequestHandler = async (request, response) => {
  const kind = mediaKindSchema.parse(request.body.kind);
  if (!request.file) {
    throw new AppError(400, 'IMAGE_REQUIRED', 'Choose an image to upload');
  }
  response.status(201).json({ asset: await uploadCroppedImage(request.file.buffer, kind) });
};

export const importAdminImage: RequestHandler = async (request, response) => {
  const input = importImageSchema.parse(request.body);
  response.status(201).json({
    asset: await importRemoteImage(input.sourceUrl, input.kind),
  });
};

export const deleteAdminImage: RequestHandler = async (request, response) => {
  const { key } = deleteImageSchema.parse(request.body);
  if (await isMediaAttached(key)) {
    throw new AppError(409, 'MEDIA_ASSET_ATTACHED', 'This image is attached to a movie');
  }
  await deleteManagedAsset(key);
  response.status(204).send();
};
