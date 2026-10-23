import express, { Router, type Response } from 'express';
import { parseOrThrow } from '../../utils/validation.js';
import { ORDER_RULES } from '../../config/marketRules.js';
import { createUserRateLimit } from '../../middleware/userRateLimit.js';
import { currentUser, requireUser } from '../auth/auth.middleware.js';
import { createReport, reportBodySchema } from './report.service.js';

export function createReportRouter(): Router {
  const router = Router();
  router.post('/market/reports', requireUser, createUserRateLimit(ORDER_RULES.reportRateLimit), express.json({ limit: '4kb' }), async (req, res: Response<{ id: string }>) => {
    res.status(201).json({ id: await createReport(currentUser(req), parseOrThrow(reportBodySchema, req.body)) });
  });
  return router;
}
