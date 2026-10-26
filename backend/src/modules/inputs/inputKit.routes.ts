import { Router, type Response } from 'express';
import { AppError } from '../../errors/AppError.js';
import { parseOrThrow } from '../../utils/validation.js';
import type { FeatureFlags } from '../flags/flag.service.js';
import { track } from '../metrics/events.js';
import { buildKit, kitQuerySchema, type KitResponse } from './inputKit.service.js';

/** Public (no login): farmers use the photo check without an account. Read-only. */
export function createInputKitRouter(flags: FeatureFlags): Router {
  const router = Router();
  router.get('/market/inputs/kit', async (req, res: Response<KitResponse>) => {
    if (!(await flags.isOn('aiKit', req.user))) throw new AppError('FORBIDDEN', 'Feature off');
    const kit = await buildKit(parseOrThrow(kitQuerySchema, req.query));
    track('ai_kit_shown', { props: { withProducts: kit.items.some((item) => item.products.length > 0) } });
    res.set('Cache-Control', 'no-store').json(kit);
  });
  return router;
}
