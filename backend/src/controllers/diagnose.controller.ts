import type { RequestHandler, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../errors/AppError.js';
import { detectImageType } from '../middleware/validateImage.js';
import type { AiProvider } from '../services/ai/aiProvider.js';
import { diagnosePhoto } from '../services/diagnosisService.js';
import type { HistoryRepository } from '../services/history/historyRepository.js';
import { recordDiagnosis } from '../services/history/recordDiagnosis.js';
import { CROPS, cropIdSchema, type DiagnoseResponse } from '../types/diagnosis.js';
import { deviceIdSchema } from '../types/history.js';

const bodySchema = z.object({
  crop: cropIdSchema,
  /** Anonymous id from the phone. Without it the diagnosis is not saved to history. */
  deviceId: deviceIdSchema.optional(),
});

export function createDiagnoseController(provider: AiProvider, history: HistoryRepository | null): RequestHandler {
  return async (req, res: Response<DiagnoseResponse>) => {
    const body = bodySchema.safeParse(req.body);
    if (!body.success) {
      throw new AppError('INVALID_INPUT', 'Missing or invalid crop/deviceId');
    }
    if (!req.file) {
      throw new AppError('INVALID_IMAGE', 'No image uploaded');
    }

    const mimeType = detectImageType(req.file.buffer);
    if (!mimeType) {
      throw new AppError('INVALID_IMAGE', 'Unsupported image type');
    }

    const { crop, deviceId } = body.data;
    const result = await diagnosePhoto(provider, { image: req.file.buffer, mimeType, cropName: CROPS[crop] });

    // Only confident results are worth keeping; the photo itself is never saved.
    const historyId = result.status === 'ok' && deviceId ? await recordDiagnosis(history, { deviceId, crop, diagnosis: result.diagnosis }) : null;
    res.json(historyId && result.status === 'ok' ? { ...result, historyId } : result);
  };
}
