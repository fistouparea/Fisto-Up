import { Router, type Response } from 'express';
import type { FlagKey } from '../../config/featureFlags.js';
import type { FeatureFlags } from './flag.service.js';

/** Which features this person sees (also without login). The app hides what is off. */
export function createFlagRouter(flags: FeatureFlags): Router {
  const router = Router();
  router.get('/account/flags', async (req, res: Response<{ flags: Record<FlagKey, boolean> }>) => {
    res.set('Cache-Control', 'no-store').json({ flags: await flags.forViewer(req.user) });
  });
  return router;
}
