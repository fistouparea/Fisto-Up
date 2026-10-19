import multer from 'multer';
import { MAX_IMAGE_BYTES } from '../types/diagnosis.js';

/** Keeps the uploaded photo in memory only; nothing is written to disk. */
export const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 5, fieldSize: 1024 },
}).single('image');
