import type { Forecast } from '../../types/weather.js';

/** Any weather source. Throws AppError('WEATHER_UNAVAILABLE') when no data can be had. */
export interface WeatherProvider {
  getForecast(lat: number, lon: number): Promise<Forecast>;
}
