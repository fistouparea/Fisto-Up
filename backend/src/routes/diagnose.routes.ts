import { Router, type RequestHandler } from 'express';
import { createDiagnoseController } from '../controllers/diagnose.controller.js';
import { uploadImage } from '../middleware/upload.js';
import type { AiProvider } from '../services/ai/aiProvider.js';

export function createDiagnoseRouter(provider: AiProvider, aiRateLimit: RequestHandler): Router {
  const router = Router();
  router.post('/diagnose', aiRateLimit, uploadImage, createDiagnoseController(provider));
  return router;
}
