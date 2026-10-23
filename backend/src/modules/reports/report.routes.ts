import express, { Router, type Response } from 'express';
import { parseOrThrow } from '../../utils/validation.js';
import { currentUser, requireUser } from '../auth/auth.middleware.js';
import { createReport, reportBodySchema } from './report.service.js';

export function createReportRouter(): Router {
  const router = Router();
  router.post('/market/reports', requireUser, express.json({ limit: '4kb' }), async (req, res: Response<{ id: string }>) => {
    res.status(201).json({ id: await createReport(currentUser(req), parseOrThrow(reportBodySchema, req.body)) });
  });
  return router;
}
