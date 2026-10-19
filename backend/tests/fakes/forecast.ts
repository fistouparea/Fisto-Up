import type { DayWeather, Forecast } from '../../src/types/weather.js';
import { addDays } from '../../src/utils/dates.js';

export const TODAY = '2026-11-10';

/** A calm, dry forecast; override single days to create test situations. */
export function makeForecast(overrides: Partial<DayWeather>[] = [], pastRainMm: number[] = [0, 0, 0, 0, 0, 0, 0]): Forecast {
  const days: DayWeather[] = Array.from({ length: 8 }, (_, i) => ({
    date: addDays(TODAY, i),
    weatherCode: 0,
    tempMax: 30,
    tempMin: 15,
    rainMm: 0,
    rainChance: 0,
    windMax: 10,
    gustMax: 20,
    et0: 4,
    ...overrides[i],
  }));
  const past = pastRainMm.map((rainMm, i) => ({ date: addDays(TODAY, i - pastRainMm.length), rainMm }));
  return { fetchedAt: `${TODAY}T06:00:00.000Z`, current: { temperature: 25, weatherCode: 0, windSpeed: 8 }, days, past };
}
