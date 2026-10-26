import express, { Router, type Response } from 'express';
import type { HistoryRepository } from '../../services/history/historyRepository.js';
import { historyItemParamsSchema } from '../../types/history.js';
import { AppError } from '../../errors/AppError.js';
import { parseOrThrow } from '../../utils/validation.js';
import type { FeatureFlags } from '../flags/flag.service.js';
import { feedbackBodySchema, saveFeedback } from './feedback.service.js';

/** POST /api/history/:id/feedback — "क्या जवाब सही था?" (no login: the device id proves the diagnosis is yours). */
export function createFeedbackRouter(history: HistoryRepository | null, flags: FeatureFlags): Router {
  const router = Router();
  router.post('/history/:id/feedback', express.json({ limit: '4kb' }), async (req, res: Response<{ ok: true }>) => {
    if (!history) throw new AppError('HISTORY_UNAVAILABLE');
    if (!(await flags.isOn('aiFeedback', undefined))) throw new AppError('FORBIDDEN', 'Feature off');
    const { id } = parseOrThrow(historyItemParamsSchema, req.params);
    await saveFeedback(history, id, parseOrThrow(feedbackBodySchema, req.body));
    res.json({ ok: true });
  });
  return router;
}
