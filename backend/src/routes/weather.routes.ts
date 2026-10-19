import { Router } from 'express';
import { createWeatherController } from '../controllers/weather.controller.js';
import type { FarmProfileRepository } from '../services/farm/farmProfileRepository.js';
import type { WeatherProvider } from '../services/weather/weatherProvider.js';

export function createWeatherRouter(farmProfiles: FarmProfileRepository | null, weather: WeatherProvider | null): Router {
  const router = Router();
  router.get('/weather', createWeatherController(farmProfiles, weather));
  return router;
}
