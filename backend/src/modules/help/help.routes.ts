import express, { Router, type Response } from 'express';
import { AppError } from '../../errors/AppError.js';
import { createIpRateLimit } from '../../middleware/rateLimit.js';
import { parseOrThrow } from '../../utils/validation.js';
import type { FeatureFlags } from '../flags/flag.service.js';
import { createHelpRequest, HELP_RULES, helpBodySchema } from './help.service.js';

/** "मदद/शिकायत": anyone with the app (login optional; with login the coordinator sees who it is). */
export function createHelpRouter(flags: FeatureFlags): Router {
  const router = Router();
  router.post('/account/help', createIpRateLimit(HELP_RULES.rateLimit), express.json({ limit: '8kb' }), async (req, res: Response<{ id: string }>) => {
    if (!(await flags.isOn('helpRequests', req.user))) throw new AppError('FORBIDDEN', 'Feature off');
    res.status(201).json({ id: await createHelpRequest(parseOrThrow(helpBodySchema, req.body), req.user) });
  });
  return router;
}
