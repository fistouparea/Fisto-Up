import express, { Router, type RequestHandler, type Response } from 'express';
import { z } from 'zod';
import { VOICE_RULES } from '../../config/voiceIntents.js';
import { AppError } from '../../errors/AppError.js';
import type { AiProvider } from '../../services/ai/aiProvider.js';
import { parseOrThrow } from '../../utils/validation.js';
import type { FeatureFlags } from '../flags/flag.service.js';
import { classifyIntent, type IntentResult } from './voiceIntent.service.js';

const intentBodySchema = z.object({ text: z.string().trim().min(1).max(VOICE_RULES.maxTextLength) });

/** "बोलकर चलाएँ" (no login needed). Shares the per-IP AI limit with the photo check and chat. */
export function createVoiceRouter({ ai, aiRateLimit, flags }: { ai: AiProvider; aiRateLimit: RequestHandler; flags: FeatureFlags }): Router {
  const router = Router();
  router.post('/voice/intent', aiRateLimit, express.json({ limit: '4kb' }), async (req, res: Response<IntentResult>) => {
    if (!(await flags.isOn('voiceMode', req.user))) throw new AppError('FORBIDDEN', 'Feature off');
    const { text } = parseOrThrow(intentBodySchema, req.body);
    res.json(await classifyIntent(ai, text));
  });
  return router;
}
