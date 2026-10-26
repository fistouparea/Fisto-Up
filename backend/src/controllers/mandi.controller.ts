import type { RequestHandler, Response } from 'express';
import type { FarmProfileRepository } from '../services/farm/farmProfileRepository.js';
import type { MandiProvider } from '../services/mandi/agmarknetProvider.js';
import { profileQuerySchema } from '../types/farm.js';
import type { MandiResponse } from '../types/mandi.js';
import { parseOrThrow } from '../utils/validation.js';
import { logger } from '../observability/logger.js';

/**
 * GET /api/mandi?deviceId — today's prices for the farmer's crops at nearby mandis.
 * Optional feature: without an API key, or if data.gov.in fails, it answers { available: false }.
 */
export function createMandiController(farmProfiles: FarmProfileRepository | null, mandi: MandiProvider | null): RequestHandler {
  return async (req, res: Response<MandiResponse>) => {
    const { deviceId } = parseOrThrow(profileQuerySchema, req.query);
    if (!mandi || !farmProfiles) {
      res.json({ available: false, prices: [] });
      return;
    }
    try {
      const profile = await farmProfiles.get(deviceId);
      const crops = profile?.crops.map((entry) => entry.crop) ?? [];
      res.json({ available: true, prices: crops.length > 0 ? await mandi.getPrices(crops) : [] });
    } catch (error) {
      logger.warn({ err: error }, 'mandi prices unavailable');
      res.json({ available: false, prices: [] });
    }
  };
}
