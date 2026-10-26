import type { FarmLocation } from '../../types/farm.js';
import type { Forecast } from '../../types/weather.js';
import type { WeatherProvider } from './weatherProvider.js';
import { logger } from '../../observability/logger.js';

/**
 * Forecast for advice that can still be given without weather (water, dashboard):
 * returns null instead of failing when there is no location or the service is down.
 */
export async function loadForecastOrNull(
  weather: WeatherProvider | null,
  location: FarmLocation | undefined,
): Promise<Forecast | null> {
  if (!weather || !location) return null;
  try {
    return await weather.getForecast(location.lat, location.lon);
  } catch (error) {
    logger.warn({ err: error }, 'weather unavailable for advice');
    return null;
  }
}
