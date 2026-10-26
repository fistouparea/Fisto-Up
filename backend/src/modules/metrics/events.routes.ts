import express, { Router, type Response } from 'express';
import { z } from 'zod';
import { CLIENT_EVENTS } from '../../config/metrics.js';
import { createIpRateLimit } from '../../middleware/rateLimit.js';
import { deviceIdSchema } from '../../types/history.js';
import { parseOrThrow } from '../../utils/validation.js';
import { track } from './events.js';

const clientEventSchema = z.object({ name: z.enum(CLIENT_EVENTS), deviceId: deviceIdSchema });

/** POST /api/events — the app reports "opened today" (once a day). Only names on the CLIENT_EVENTS list. */
export function createEventsRouter(): Router {
  const router = Router();
  router.post('/events', createIpRateLimit({ windowMs: 60 * 60_000, limit: 120 }), express.json({ limit: '1kb' }), (req, res: Response<{ ok: true }>) => {
    const { name, deviceId } = parseOrThrow(clientEventSchema, req.body);
    track(name, { deviceId });
    res.status(202).json({ ok: true });
  });
  return router;
}
