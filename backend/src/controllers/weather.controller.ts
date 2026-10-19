import type { RequestHandler, Response } from 'express';
import { cropsInField } from '../services/agro/cropsInField.js';
import { evaluateAlerts } from '../services/agro/weatherAlerts.js';
import type { FarmProfileRepository } from '../services/farm/farmProfileRepository.js';
import type { WeatherProvider } from '../services/weather/weatherProvider.js';
import { profileQuerySchema } from '../types/farm.js';
import type { Forecast, WeatherAlert } from '../types/weather.js';
import { todayInIndia } from '../utils/dates.js';
import { parseOrThrow, requireRepository } from '../utils/validation.js';

interface WeatherResponse {
  /** null when the farm has no location yet. */
  forecast: Forecast | null;
  alerts: WeatherAlert[];
}

/** GET /api/weather?deviceId — forecast for the farm location plus crop-aware alerts. */
export function createWeatherController(
  farmProfiles: FarmProfileRepository | null,
  weather: WeatherProvider | null,
): RequestHandler {
  return async (req, res: Response<WeatherResponse>) => {
    const { deviceId } = parseOrThrow(profileQuerySchema, req.query);
    const profile = await requireRepository(farmProfiles).get(deviceId);
    if (!profile?.location) {
      res.json({ forecast: null, alerts: [] });
      return;
    }

    const forecast = await requireRepository(weather).getForecast(profile.location.lat, profile.location.lon);
    res.json({ forecast, alerts: evaluateAlerts(forecast, cropsInField(profile, todayInIndia())) });
  };
}
