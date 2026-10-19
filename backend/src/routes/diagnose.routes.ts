import { Router } from 'express';
import { createDiagnoseController } from '../controllers/diagnose.controller.js';
import { diagnoseRateLimit } from '../middleware/rateLimit.js';
import { uploadImage } from '../middleware/upload.js';
import type { AiProvider } from '../services/ai/aiProvider.js';

export function createDiagnoseRouter(provider: AiProvider): Router {
  const router = Router();
  router.post('/diagnose', diagnoseRateLimit, uploadImage, createDiagnoseController(provider));
  return router;
}
