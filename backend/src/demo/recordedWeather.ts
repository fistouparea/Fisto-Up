import type { Forecast } from '../types/weather.js';
import type { WeatherProvider } from '../services/weather/weatherProvider.js';
import type { Recordings } from './recordings.js';

const DAY_MS = 86_400_000;

function shiftDate(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/**
 * Offline demo weather: one real recorded Open-Meteo forecast, moved so its first day is today (India),
 * the same for every place. Only used with DEMO_MODE (never in production).
 */
export class RecordedWeatherProvider implements WeatherProvider {
  constructor(
    private readonly recording: Recordings['forecast'],
    private readonly today: () => string,
  ) {}

  async getForecast(): Promise<Forecast> {
    const data = this.recording.data;
    const first = data.days[0]?.date ?? this.today();
    const offset = Math.round((Date.parse(`${this.today()}T00:00:00Z`) - Date.parse(`${first}T00:00:00Z`)) / DAY_MS);
    return {
      fetchedAt: new Date().toISOString(),
      current: data.current,
      days: data.days.map((day) => ({ ...day, date: shiftDate(day.date, offset) })),
      past: data.past.map((day) => ({ ...day, date: shiftDate(day.date, offset) })),
    };
  }
}
