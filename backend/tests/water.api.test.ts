import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { WATER_TIPS } from '../src/config/agroRules.js';
import type { WeatherProvider } from '../src/services/weather/weatherProvider.js';
import { addDays, todayInIndia } from '../src/utils/dates.js';
import { makeForecast } from './fakes/forecast.js';
import { InMemoryFarmProfileRepository } from './fakes/inMemoryFarmProfileRepository.js';
import { createFakeProvider } from './helpers.js';

const DEVICE = randomUUID();
const today = todayInIndia();

async function appWith(weather: WeatherProvider) {
  const farmProfiles = new InMemoryFarmProfileRepository();
  await farmProfiles.save(DEVICE, {
    location: { lat: 28.3, lon: 74.95, source: 'list' },
    irrigation: 'tubewell',
    crops: [
      { crop: 'gehun', sowingDate: addDays(today, -30), lastWateredOn: addDays(today, -12) },
      { crop: 'sarson', sowingDate: addDays(today, -200) }, // already harvested
    ],
  });
  return createApp({ aiProvider: createFakeProvider(), historyRepository: null, farmProfiles, weather, corsOrigins: [] });
}

describe('GET /api/water', () => {
  it('returns advice for growing crops only, plus water-saving tips', async () => {
    const forecast = { ...makeForecast(), days: makeForecast().days.map((day, i) => ({ ...day, date: addDays(today, i), et0: 5 })) };
    const res = await request(await appWith({ getForecast: async () => forecast })).get('/api/water').query({ deviceId: DEVICE });

    expect(res.status).toBe(200);
    expect(res.body.advice).toEqual([expect.objectContaining({ crop: 'gehun', status: 'water_today' })]);
    expect(res.body.tips).toEqual(WATER_TIPS);
  });

  it('still answers (check the soil) when the weather service is down', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const down: WeatherProvider = { getForecast: async () => Promise.reject(new Error('down')) };
    const res = await request(await appWith(down)).get('/api/water').query({ deviceId: DEVICE });

    expect(res.status).toBe(200);
    expect(res.body.advice[0]).toMatchObject({ crop: 'gehun', status: 'check_soil' });
  });

  it('returns no advice for a device without a profile', async () => {
    const res = await request(await appWith({ getForecast: vi.fn() })).get('/api/water').query({ deviceId: randomUUID() });
    expect(res.body.advice).toEqual([]);
  });
});
