import { z } from 'zod';
import { AppError } from '../../errors/AppError.js';
import type { DayWeather, Forecast } from '../../types/weather.js';
import { todayInIndia } from '../../utils/dates.js';
import { fetchWithRetry } from '../../utils/http.js';
import type { WeatherProvider } from './weatherProvider.js';

const API_URL = 'https://api.open-meteo.com/v1/forecast';
const DAILY_FIELDS = [
  'weather_code',
  'temperature_2m_max',
  'temperature_2m_min',
  'precipitation_sum',
  'precipitation_probability_max',
  'wind_speed_10m_max',
  'wind_gusts_10m_max',
  'et0_fao_evapotranspiration',
] as const;

const numbers = z.array(z.number().nullable());
const responseSchema = z.object({
  current: z
    .object({ temperature_2m: z.number(), weather_code: z.number(), wind_speed_10m: z.number() })
    .optional(),
  daily: z.object({
    time: z.array(z.iso.date()),
    weather_code: numbers,
    temperature_2m_max: numbers,
    temperature_2m_min: numbers,
    precipitation_sum: numbers,
    precipitation_probability_max: numbers,
    wind_speed_10m_max: numbers,
    wind_gusts_10m_max: numbers,
    et0_fao_evapotranspiration: numbers,
  }),
});
type OpenMeteoResponse = z.infer<typeof responseSchema>;

export interface OpenMeteoOptions {
  /** Injected in tests. */
  fetchFn?: typeof fetch;
  timeoutMs?: number;
  cacheTtlMs?: number;
  now?: () => Date;
  /** Injected in tests to skip the wait before the retry. */
  sleep?: (ms: number) => Promise<void>;
}

/**
 * Free Open-Meteo forecast (no API key). Results are cached per ~1 km grid cell for an hour,
 * and the last good copy is served if the service is down.
 */
export class OpenMeteoProvider implements WeatherProvider {
  private readonly cache = new Map<string, { forecast: Forecast; expiresAt: number }>();
  private readonly fetchFn: typeof fetch;
  private readonly timeoutMs: number;
  private readonly cacheTtlMs: number;
  private readonly now: () => Date;
  private readonly sleep: ((ms: number) => Promise<void>) | undefined;

  constructor(options: OpenMeteoOptions = {}) {
    this.sleep = options.sleep;
    this.fetchFn = options.fetchFn ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 8_000;
    this.cacheTtlMs = options.cacheTtlMs ?? 60 * 60 * 1000;
    this.now = options.now ?? (() => new Date());
  }

  async getForecast(lat: number, lon: number): Promise<Forecast> {
    const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > this.now().getTime()) return cached.forecast;

    try {
      const forecast = toForecast(await this.request(lat, lon), this.now());
      this.cache.set(key, { forecast, expiresAt: this.now().getTime() + this.cacheTtlMs });
      return forecast;
    } catch (error) {
      if (cached) return cached.forecast; // stale but better than nothing
      throw new AppError('WEATHER_UNAVAILABLE', 'Open-Meteo request failed', { cause: error });
    }
  }

  private async request(lat: number, lon: number): Promise<OpenMeteoResponse> {
    const params = new URLSearchParams({
      latitude: lat.toFixed(2),
      longitude: lon.toFixed(2),
      daily: DAILY_FIELDS.join(','),
      current: 'temperature_2m,weather_code,wind_speed_10m',
      timezone: 'Asia/Kolkata',
      past_days: '7',
      forecast_days: '8',
    });
    const response = await fetchWithRetry(this.fetchFn, `${API_URL}?${params}`, { timeoutMs: this.timeoutMs, sleep: this.sleep });
    if (!response.ok) throw new Error(`Open-Meteo HTTP ${response.status}`);
    return responseSchema.parse(await response.json());
  }
}

/** Splits the daily arrays into past days (rain only) and today + next days. */
function toForecast(data: OpenMeteoResponse, now: Date): Forecast {
  const today = todayInIndia(now);
  const { daily } = data;
  const days: DayWeather[] = [];
  const past: Forecast['past'] = [];

  daily.time.forEach((date, i) => {
    const rainMm = daily.precipitation_sum[i] ?? 0;
    if (date < today) {
      past.push({ date, rainMm });
      return;
    }
    const tempMax = daily.temperature_2m_max[i];
    const tempMin = daily.temperature_2m_min[i];
    if (tempMax == null || tempMin == null) return; // a day without temperatures is not useful
    days.push({
      date,
      weatherCode: daily.weather_code[i] ?? 0,
      tempMax,
      tempMin,
      rainMm,
      rainChance: daily.precipitation_probability_max[i] ?? 0,
      windMax: daily.wind_speed_10m_max[i] ?? 0,
      gustMax: daily.wind_gusts_10m_max[i] ?? 0,
      et0: daily.et0_fao_evapotranspiration[i] ?? null,
    });
  });

  if (days.length === 0) throw new Error('Open-Meteo returned no forecast days');

  return {
    fetchedAt: now.toISOString(),
    current: data.current
      ? { temperature: data.current.temperature_2m, weatherCode: data.current.weather_code, windSpeed: data.current.wind_speed_10m }
      : null,
    days,
    past,
  };
}
