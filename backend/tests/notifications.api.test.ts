import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { Severity } from '../src/types/diagnosis.js';
import { addDays, todayInIndia } from '../src/utils/dates.js';
import { InMemoryFarmProfileRepository } from './fakes/inMemoryFarmProfileRepository.js';
import { InMemoryHistoryRepository } from './fakes/inMemoryHistoryRepository.js';
import { InMemoryPushSubscriptionRepository } from './fakes/inMemoryPushSubscriptionRepository.js';
import { createFakeProvider, healthyDiagnosis } from './helpers.js';

const DEVICE = randomUUID();
const DAY = 86_400_000;
const today = todayInIndia();
const { is_plant_image: _p, confidence: _c, ...diagnosis } = healthyDiagnosis;

async function setup() {
  const farmProfiles = new InMemoryFarmProfileRepository();
  const history = new InMemoryHistoryRepository();
  await farmProfiles.save(DEVICE, { crops: [{ crop: 'chana', sowingDate: addDays(today, -40) }] });
  const seed = (daysAgo: number, severity: Severity, deviceId = DEVICE) =>
    history.seed({ deviceId, crop: 'chana', diagnosis: { ...diagnosis, severity } }, new Date(Date.now() - daysAgo * DAY));
  const app = createApp({
    aiProvider: createFakeProvider(),
    historyRepository: history,
    farmProfiles,
    push: { publicKey: 'PUBLIC_KEY', subscriptions: new InMemoryPushSubscriptionRepository() },
    corsOrigins: [],
  });
  return { app, seed };
}

const followUpIds = async (app: Awaited<ReturnType<typeof setup>>['app']) =>
  (await request(app).get('/api/notifications').query({ deviceId: DEVICE })).body.items
    .filter((item: { type: string }) => item.type === 'followup')
    .map((item: { diagnosisId: string }) => item.diagnosisId);

describe('GET /api/calendar', () => {
  it('returns the stage timeline and tasks for each crop', async () => {
    const { app } = await setup();
    const res = await request(app).get('/api/calendar').query({ deviceId: DEVICE });
    expect(res.status).toBe(200);
    expect(res.body.crops).toHaveLength(1);
    expect(res.body.crops[0]).toMatchObject({ crop: 'chana', daysSinceSowing: 40, stage: 'vegetative', stageName: 'बढ़वार' });
    expect(res.body.crops[0].timeline).toHaveLength(6);
    expect(res.body.crops[0].tasks.length).toBeGreaterThan(0);
  });
});

describe('follow-ups ("क्या फसल ठीक हुई?")', () => {
  it('asks about non-healthy checks 3 to 21 days old, for this device only', async () => {
    const { app, seed } = await setup();
    const due = seed(4, 'mild');
    seed(4, 'healthy'); // healthy: nothing to follow up
    seed(2, 'serious'); // too recent
    seed(30, 'serious'); // too old
    seed(5, 'serious', randomUUID()); // another phone

    expect(await followUpIds(app)).toEqual([due]);
  });

  it('stops asking once answered', async () => {
    const { app, seed } = await setup();
    const id = seed(4, 'serious');

    const res = await request(app).post(`/api/history/${id}/follow-up`).send({ deviceId: DEVICE, answer: 'worse' });
    expect(res.status).toBe(200);
    expect(await followUpIds(app)).toEqual([]);
  });

  it('validates the answer and the owner', async () => {
    const { app, seed } = await setup();
    const id = seed(4, 'serious');

    expect((await request(app).post(`/api/history/${id}/follow-up`).send({ deviceId: DEVICE, answer: 'maybe' })).status).toBe(400);
    expect((await request(app).post(`/api/history/${id}/follow-up`).send({ deviceId: randomUUID(), answer: 'same' })).status).toBe(404);
  });
});

describe('push endpoints', () => {
  const subscription = { endpoint: 'https://push.example.com/abc', keys: { p256dh: 'key', auth: 'auth' } };

  it('returns the public key, or null when push is off', async () => {
    const { app } = await setup();
    expect((await request(app).get('/api/push/key')).body).toEqual({ publicKey: 'PUBLIC_KEY' });

    const off = createApp({ aiProvider: createFakeProvider(), historyRepository: null, corsOrigins: [] });
    expect((await request(off).get('/api/push/key')).body).toEqual({ publicKey: null });
  });

  it('saves a valid subscription and rejects bad ones', async () => {
    const { app } = await setup();
    expect((await request(app).post('/api/push/subscribe').send({ deviceId: DEVICE, subscription })).status).toBe(200);

    const insecure = { ...subscription, endpoint: 'http://push.example.com/abc' };
    expect((await request(app).post('/api/push/subscribe').send({ deviceId: DEVICE, subscription: insecure })).status).toBe(400);
    expect((await request(app).post('/api/push/subscribe').send({ deviceId: DEVICE })).status).toBe(400);
  });
});
