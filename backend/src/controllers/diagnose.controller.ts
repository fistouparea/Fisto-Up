import type { RequestHandler, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../errors/AppError.js';
import { detectImageType } from '../middleware/validateImage.js';
import type { AiProvider } from '../services/ai/aiProvider.js';
import { diagnosePhoto } from '../services/diagnosisService.js';
import { CROPS, cropIdSchema, type DiagnoseResponse } from '../types/diagnosis.js';

const bodySchema = z.object({ crop: cropIdSchema });

export function createDiagnoseController(provider: AiProvider): RequestHandler {
  return async (req, res: Response<DiagnoseResponse>) => {
    const body = bodySchema.safeParse(req.body);
    if (!body.success) {
      throw new AppError('INVALID_INPUT', 'Missing or unknown crop');
    }
    if (!req.file) {
      throw new AppError('INVALID_IMAGE', 'No image uploaded');
    }

    const mimeType = detectImageType(req.file.buffer);
    if (!mimeType) {
      throw new AppError('INVALID_IMAGE', 'Unsupported image type');
    }

    const result = await diagnosePhoto(provider, {
      image: req.file.buffer,
      mimeType,
      cropName: CROPS[body.data.crop],
    });
    res.json(result);
  };
}
