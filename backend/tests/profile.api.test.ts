import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { addDays, todayInIndia } from '../src/utils/dates.js';
import { InMemoryFarmProfileRepository } from './fakes/inMemoryFarmProfileRepository.js';
import { createFakeProvider } from './helpers.js';

const DEVICE = randomUUID();
const today = todayInIndia();

function appWith(farmProfiles: InMemoryFarmProfileRepository | null = new InMemoryFarmProfileRepository()) {
  return createApp({ aiProvider: createFakeProvider(), historyRepository: null, farmProfiles, corsOrigins: [] });
}

const validProfile = {
  location: { lat: 28.304567, lon: 74.967891, source: 'gps' },
  crops: [
    { crop: 'chana', sowingDate: addDays(today, -40) },
    { crop: 'sarson', sowingDate: addDays(today, -10) },
  ],
  fieldSizeBigha: 5,
  irrigation: 'tubewell',
};

describe('farm profile API', () => {
  it('returns null before the farmer fills the profile', async () => {
    const res = await request(appWith()).get('/api/profile').query({ deviceId: DEVICE });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ profile: null });
  });

  it('saves and returns the profile, with GPS rounded to ~1 km', async () => {
    const app = appWith();
    const saved = await request(app).put('/api/profile').send({ deviceId: DEVICE, profile: validProfile });
    expect(saved.status).toBe(200);
    expect(saved.body.profile.location).toEqual({ lat: 28.3, lon: 74.97, source: 'gps' });

    const loaded = await request(app).get('/api/profile').query({ deviceId: DEVICE });
    expect(loaded.body.profile).toMatchObject({ crops: validProfile.crops, fieldSizeBigha: 5, irrigation: 'tubewell' });
  });

  it('accepts a profile where every screen was skipped', async () => {
    const res = await request(appWith()).put('/api/profile').send({ deviceId: DEVICE, profile: {} });
    expect(res.status).toBe(200);
    expect(res.body.profile.crops).toEqual([]);
  });

  it('keeps the tehsil picked from the list', async () => {
    const profile = { location: { lat: 28.44, lon: 74.49, source: 'list', district: 'चूरू', tehsil: 'सरदारशहर' } };
    const res = await request(appWith()).put('/api/profile').send({ deviceId: DEVICE, profile });
    expect(res.body.profile.location).toMatchObject({ district: 'चूरू', tehsil: 'सरदारशहर' });
  });

  it.each([
    ['bad deviceId', { deviceId: 'abc', profile: validProfile }],
    ['unknown crop', { deviceId: DEVICE, profile: { crops: [{ crop: 'banana', sowingDate: today }] } }],
    ['future sowing date', { deviceId: DEVICE, profile: { crops: [{ crop: 'chana', sowingDate: addDays(today, 3) }] } }],
    ['sowing date over a year ago', { deviceId: DEVICE, profile: { crops: [{ crop: 'chana', sowingDate: addDays(today, -400) }] } }],
    ['bad date format', { deviceId: DEVICE, profile: { crops: [{ crop: 'chana', sowingDate: '19/10/2026' }] } }],
    ['same crop twice', { deviceId: DEVICE, profile: { crops: [{ crop: 'chana', sowingDate: today }, { crop: 'chana', sowingDate: today }] } }],
    ['negative field size', { deviceId: DEVICE, profile: { fieldSizeBigha: -2 } }],
    ['unknown irrigation', { deviceId: DEVICE, profile: { irrigation: 'river' } }],
    ['latitude out of range', { deviceId: DEVICE, profile: { location: { lat: 128, lon: 74, source: 'gps' } } }],
  ])('rejects %s', async (_label, body) => {
    const res = await request(appWith()).put('/api/profile').send(body);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: { code: 'INVALID_INPUT' } });
  });

  it('records "आज पानी दिया" for one crop', async () => {
    const app = appWith();
    await request(app).put('/api/profile').send({ deviceId: DEVICE, profile: validProfile });
    const res = await request(app).post('/api/profile/watered').send({ deviceId: DEVICE, crop: 'chana' });

    expect(res.status).toBe(200);
    expect(res.body.profile.crops[0]).toMatchObject({ crop: 'chana', lastWateredOn: today });
    expect(res.body.profile.crops[1]).not.toHaveProperty('lastWateredOn');
  });

  it('returns NOT_FOUND when watering a crop that is not in the profile', async () => {
    const app = appWith();
    await request(app).put('/api/profile').send({ deviceId: DEVICE, profile: validProfile });
    const res = await request(app).post('/api/profile/watered').send({ deviceId: DEVICE, crop: 'gehun' });
    expect(res.status).toBe(404);
  });

  it('returns STORAGE_UNAVAILABLE without MongoDB', async () => {
    const res = await request(appWith(null)).get('/api/profile').query({ deviceId: DEVICE });
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ error: { code: 'STORAGE_UNAVAILABLE' } });
  });
});
