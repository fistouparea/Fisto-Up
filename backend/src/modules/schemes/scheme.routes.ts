import express, { Router, type Response } from 'express';
import { AppError } from '../../errors/AppError.js';
import type { SchemeData } from '../../data/schemes.js';
import { parseOrThrow } from '../../utils/validation.js';
import { audit } from '../audit/audit.service.js';
import { currentUser, requireRole } from '../auth/auth.middleware.js';
import type { FeatureFlags } from '../flags/flag.service.js';
import { forMeQuerySchema, listSchemes, schemesFor, schemeUpdateSchema, updateScheme, type SchemeView } from './scheme.service.js';

/** Sarkari Yojana: public read (no login), coordinator corrections in the panel. */
export function createSchemeRouter(flags: FeatureFlags): Router {
  const router = Router();

  router.get('/schemes', async (req, res: Response<{ items: SchemeView[] }>) => {
    if (!(await flags.isOn('schemes', req.user))) throw new AppError('FORBIDDEN', 'Feature off');
    const { deviceId } = parseOrThrow(forMeQuerySchema, req.query);
    res.set('Cache-Control', 'no-store').json({ items: await schemesFor(deviceId) });
  });

  router.get('/admin/schemes', requireRole('coordinator'), async (_req, res: Response<{ items: SchemeData[] }>) => {
    res.json({ items: await listSchemes() });
  });

  router.put('/admin/schemes/:id', requireRole('coordinator'), express.json({ limit: '16kb' }), async (req, res: Response<{ scheme: SchemeData }>) => {
    const change = parseOrThrow(schemeUpdateSchema, req.body);
    const scheme = await updateScheme(String(req.params.id), change, currentUser(req).id);
    await audit(req, 'scheme.update', { type: 'scheme', id: scheme.id }, { fields: Object.keys(change).join(','), status: scheme.status });
    res.json({ scheme });
  });
  return router;
}
