import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { WeatherProvider } from '../src/services/weather/weatherProvider.js';
import { addDays, todayInIndia } from '../src/utils/dates.js';
import { makeForecast } from './fakes/forecast.js';
import { InMemoryFarmProfileRepository } from './fakes/inMemoryFarmProfileRepository.js';
import { InMemoryHistoryRepository } from './fakes/inMemoryHistoryRepository.js';
import { createFakeProvider, healthyDiagnosis } from './helpers.js';

const DEVICE = randomUUID();
const today = todayInIndia();
const { is_plant_image: _p, confidence: _c, ...diagnosis } = healthyDiagnosis;

const frosty: WeatherProvider = {
  getForecast: async () => ({
    ...makeForecast(),
    days: makeForecast([{ tempMin: 3 }]).days.map((day, i) => ({ ...day, date: addDays(today, i) })),
    past: [{ date: addDays(today, -1), rainMm: 5 }],
  }),
};

async function setup(withProfile = true) {
  const farmProfiles = new InMemoryFarmProfileRepository();
  const history = new InMemoryHistoryRepository();
  if (withProfile) {
    await farmProfiles.save(DEVICE, {
      location: { lat: 28.3, lon: 74.95, source: 'gps' },
      irrigation: 'tubewell',
      crops: [
        { crop: 'chana', sowingDate: addDays(today, -40) },
        { crop: 'sarson', sowingDate: addDays(today, -60) },
        { crop: 'gehun', sowingDate: addDays(today, -25) },
        { crop: 'jeera', sowingDate: addDays(today, -20) },
      ],
    });
  }
  history.seed({ deviceId: DEVICE, crop: 'chana', diagnosis: { ...diagnosis, severity: 'mild' } }, new Date(Date.now() - 4 * 86_400_000));
  return createApp({ aiProvider: createFakeProvider(), historyRepository: history, farmProfiles, weather: frosty, corsOrigins: [] });
}

describe('GET /api/dashboard', () => {
  it('returns weather, alerts, at most 3 tasks, water and follow-ups in one response', async () => {
    const res = await request(await setup()).get('/api/dashboard').query({ deviceId: DEVICE });

    expect(res.status).toBe(200);
    expect(res.body.hasProfile).toBe(true);
    expect(res.body.forecast.days[0].date).toBe(today);
    expect(res.body.alerts.map((alert: { type: string }) => alert.type)).toEqual(['frost']);
    expect(res.body.tasks).toHaveLength(3);
    expect(res.body.tasks[0]).toMatchObject({ crop: 'chana', stageName: 'बढ़वार', task: expect.any(String) });
    expect(res.body.water).toHaveLength(4);
    expect(res.body.followUps).toHaveLength(1);
    expect(Date.parse(res.body.generatedAt)).not.toBeNaN();
  });

  it('works for a new phone without a profile (follow-ups still shown)', async () => {
    const res = await request(await setup(false)).get('/api/dashboard').query({ deviceId: DEVICE });
    expect(res.body).toMatchObject({ hasProfile: false, forecast: null, alerts: [], tasks: [], water: [] });
    expect(res.body.followUps).toHaveLength(1);
  });
});
