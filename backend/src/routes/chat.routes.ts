import express, { Router, type RequestHandler } from 'express';
import { createChatController } from '../controllers/chat.controller.js';
import type { AiProvider } from '../services/ai/aiProvider.js';

export function createChatRouter(provider: AiProvider, aiRateLimit: RequestHandler): Router {
  const router = Router();
  router.post('/chat', aiRateLimit, express.json({ limit: '32kb' }), createChatController(provider));
  return router;
}
