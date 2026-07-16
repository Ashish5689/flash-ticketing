import { Router } from 'express';
import multer from 'multer';

import { requireAuth, requireRole } from '../../middleware/auth.js';
import { AppError } from '../../shared/errors.js';
import { deleteAdminImage, importAdminImage, uploadAdminImage } from './media.controller.js';

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => {
    if (!allowedTypes.has(file.mimetype)) {
      callback(new AppError(415, 'UNSUPPORTED_IMAGE_TYPE', 'Use a JPEG, PNG, or WebP image'));
      return;
    }
    callback(null, true);
  },
});

export const adminMediaRouter = Router();
adminMediaRouter.use(requireAuth, requireRole('ADMIN'));
adminMediaRouter.post('/images/upload', imageUpload.single('file'), uploadAdminImage);
adminMediaRouter.post('/images/import', importAdminImage);
adminMediaRouter.delete('/images', deleteAdminImage);
