import { Router, type RequestHandler, type Response } from 'express';
import { parseOrThrow } from '../../utils/validation.js';
import { requireRole } from '../auth/auth.middleware.js';
import { suggestPrice, type PricingDeps } from './pricing.service.js';
import { suggestQuerySchema, type PriceSuggestion } from './pricing.types.js';

export function createPricingRouter(deps: PricingDeps, aiRateLimit: RequestHandler): Router {
  const router = Router();
  router.get(
    '/market/pricing/suggest',
    requireRole('seller', 'coordinator'),
    aiRateLimit,
    async (req, res: Response<PriceSuggestion>) => {
      const { product, unit } = parseOrThrow(suggestQuerySchema, req.query);
      res.json(await suggestPrice(product, unit, deps));
    },
  );
  return router;
}
