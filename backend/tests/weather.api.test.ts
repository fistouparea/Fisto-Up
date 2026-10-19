import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { AppError } from '../src/errors/AppError.js';
import type { WeatherProvider } from '../src/services/weather/weatherProvider.js';
import { addDays, todayInIndia } from '../src/utils/dates.js';
import { InMemoryFarmProfileRepository } from './fakes/inMemoryFarmProfileRepository.js';
import { makeForecast } from './fakes/forecast.js';
import { createFakeProvider } from './helpers.js';

const DEVICE = randomUUID();

async function setup(weather: WeatherProvider | null, withLocation = true) {
  const farmProfiles = new InMemoryFarmProfileRepository();
  await farmProfiles.save(DEVICE, {
    crops: [{ crop: 'jeera', sowingDate: addDays(todayInIndia(), -60) }],
    ...(withLocation ? { location: { lat: 28.3, lon: 74.95, source: 'gps' as const } } : {}),
  });
  return createApp({ aiProvider: createFakeProvider(), historyRepository: null, farmProfiles, weather, corsOrigins: [] });
}

describe('GET /api/weather', () => {
  it('returns the forecast for the farm location with crop-aware alerts', async () => {
    const getForecast = vi.fn(async () => makeForecast([{ tempMin: 3 }], [5]));
    const res = await request(await setup({ getForecast })).get('/api/weather').query({ deviceId: DEVICE });

    expect(res.status).toBe(200);
    expect(getForecast).toHaveBeenCalledWith(28.3, 74.95);
    expect(res.body.forecast.days).toHaveLength(8);
    expect(res.body.alerts).toHaveLength(1);
    expect(res.body.alerts[0]).toMatchObject({ type: 'frost', advice: expect.arrayContaining([expect.stringContaining('जीरे')]) });
  });

  it('returns no forecast when the farm has no location yet', async () => {
    const getForecast = vi.fn();
    const res = await request(await setup({ getForecast }, false)).get('/api/weather').query({ deviceId: DEVICE });
    expect(res.body).toEqual({ forecast: null, alerts: [] });
    expect(getForecast).not.toHaveBeenCalled();
  });

  it('returns WEATHER_UNAVAILABLE when the weather service fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const failing: WeatherProvider = {
      getForecast: async () => {
        throw new AppError('WEATHER_UNAVAILABLE');
      },
    };
    const res = await request(await setup(failing)).get('/api/weather').query({ deviceId: DEVICE });
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ error: { code: 'WEATHER_UNAVAILABLE' } });
  });

  it('rejects a missing deviceId', async () => {
    const res = await request(await setup({ getForecast: vi.fn() })).get('/api/weather');
    expect(res.status).toBe(400);
  });
});
