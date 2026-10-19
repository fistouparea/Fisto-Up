import type { RequestHandler, Response } from 'express';
import { WATER_TIPS } from '../config/agroRules.js';
import { waterAdvice } from '../services/agro/waterGuidance.js';
import type { FarmProfileRepository } from '../services/farm/farmProfileRepository.js';
import { loadForecastOrNull } from '../services/weather/loadForecast.js';
import type { WeatherProvider } from '../services/weather/weatherProvider.js';
import { profileQuerySchema } from '../types/farm.js';
import type { WaterAdvice, WaterGuidance } from '../types/water.js';
import { todayInIndia } from '../utils/dates.js';
import { parseOrThrow, requireRepository } from '../utils/validation.js';

/** GET /api/water?deviceId — today's water advice for each crop in the profile, plus saving tips. */
export function createWaterController(
  farmProfiles: FarmProfileRepository | null,
  weather: WeatherProvider | null,
): RequestHandler {
  return async (req, res: Response<WaterGuidance>) => {
    const { deviceId } = parseOrThrow(profileQuerySchema, req.query);
    const profile = await requireRepository(farmProfiles).get(deviceId);
    if (!profile) {
      res.json({ advice: [], tips: WATER_TIPS });
      return;
    }

    const forecast = await loadForecastOrNull(weather, profile.location);
    const today = todayInIndia();
    const advice = profile.crops
      .map((crop) => waterAdvice({ crop, irrigation: profile.irrigation, forecast, today }))
      .filter((entry): entry is WaterAdvice => entry !== null);
    res.json({ advice, tips: WATER_TIPS });
  };
}
