import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { AppError } from '../src/errors/AppError.js';
import type { HistoryRepository } from '../src/services/history/historyRepository.js';
import { createFakeProvider, createTestApp, healthyDiagnosis, JPEG_BYTES } from './helpers.js';
import { InMemoryHistoryRepository } from './inMemoryHistoryRepository.js';

const DEVICE = randomUUID();
const OTHER_DEVICE = randomUUID();

function diagnose(app: ReturnType<typeof createTestApp>, fields: Record<string, string>) {
  const req = request(app).post('/api/diagnose');
  for (const [name, value] of Object.entries(fields)) req.field(name, value);
  return req.attach('image', JPEG_BYTES, { filename: 'leaf.jpg', contentType: 'image/jpeg' });
}

/** A repository whose every call fails, like MongoDB being down. */
const brokenHistory: HistoryRepository = {
  save: async () => {
    throw new AppError('HISTORY_UNAVAILABLE');
  },
  list: async () => {
    throw new AppError('HISTORY_UNAVAILABLE');
  },
  findById: async () => {
    throw new AppError('HISTORY_UNAVAILABLE');
  },
};

describe('saving diagnoses to history', () => {
  it('saves a confident diagnosis with deviceId and crop, but not the image', async () => {
    const history = new InMemoryHistoryRepository();
    const res = await diagnose(createTestApp(undefined, history), { crop: 'bajra', deviceId: DEVICE });

    expect(res.status).toBe(200);
    expect(history.records).toHaveLength(1);
    const saved = history.records[0];
    expect(saved?.deviceId).toBe(DEVICE);
    expect(saved?.crop).toBe('bajra');
    expect(saved?.diagnosis).toEqual(res.body.diagnosis);
    expect(JSON.stringify(saved)).not.toContain(JPEG_BYTES.toString('base64'));
  });

  it('does not save "unclear" results', async () => {
    const history = new InMemoryHistoryRepository();
    const provider = createFakeProvider({ ...healthyDiagnosis, confidence: 'low' });
    await diagnose(createTestApp(provider, history), { crop: 'bajra', deviceId: DEVICE });

    expect(history.records).toHaveLength(0);
  });

  it('does not save without a deviceId', async () => {
    const history = new InMemoryHistoryRepository();
    await diagnose(createTestApp(undefined, history), { crop: 'bajra' });

    expect(history.records).toHaveLength(0);
  });

  it('rejects an invalid deviceId', async () => {
    const res = await diagnose(createTestApp(undefined, new InMemoryHistoryRepository()), {
      crop: 'bajra',
      deviceId: 'not-a-uuid',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_INPUT');
  });

  it('still returns the diagnosis when the database is down, and logs the error', async () => {
    const logSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = await diagnose(createTestApp(undefined, brokenHistory), { crop: 'bajra', deviceId: DEVICE });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('history'), expect.anything());
  });

  it('still returns the diagnosis when history is not configured', async () => {
    const res = await diagnose(createTestApp(undefined, null), { crop: 'bajra', deviceId: DEVICE });
    expect(res.status).toBe(200);
  });
});

describe('GET /api/history', () => {
  async function seededApp(count: number) {
    const history = new InMemoryHistoryRepository();
    const crops = ['bajra', 'guar', 'chana'] as const;
    for (let i = 0; i < count; i++) {
      const crop = crops[i % crops.length] ?? 'bajra';
      await history.save({ deviceId: DEVICE, crop, diagnosis: { ...healthyDiagnosis, problem_name: `रोग ${i}` } });
    }
    await history.save({ deviceId: OTHER_DEVICE, crop: 'bajra', diagnosis: healthyDiagnosis });
    return { app: createTestApp(undefined, history), history };
  }

  it('lists this device only, latest first, with date and problem name', async () => {
    const { app } = await seededApp(3);
    const res = await request(app).get('/api/history').query({ deviceId: DEVICE });

    expect(res.status).toBe(200);
    expect(res.body.items.map((item: { problemName: string }) => item.problemName)).toEqual(['रोग 2', 'रोग 1', 'रोग 0']);
    expect(res.body.items[0]).toEqual({
      id: expect.any(String),
      crop: 'chana',
      problemName: 'रोग 2',
      createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    });
    expect(res.body).toMatchObject({ page: 1, limit: 10, hasMore: false });
  });

  it('paginates', async () => {
    const { app } = await seededApp(5);
    const first = await request(app).get('/api/history').query({ deviceId: DEVICE, limit: 2 });
    const last = await request(app).get('/api/history').query({ deviceId: DEVICE, limit: 2, page: 3 });

    expect(first.body.items).toHaveLength(2);
    expect(first.body.hasMore).toBe(true);
    expect(last.body.items.map((item: { problemName: string }) => item.problemName)).toEqual(['रोग 0']);
    expect(last.body.hasMore).toBe(false);
  });

  it('returns an empty list for a new device', async () => {
    const { app } = await seededApp(2);
    const res = await request(app).get('/api/history').query({ deviceId: randomUUID() });
    expect(res.body).toMatchObject({ items: [], hasMore: false });
  });

  it.each([
    ['missing deviceId', {}],
    ['invalid deviceId', { deviceId: 'abc' }],
    ['page 0', { deviceId: DEVICE, page: 0 }],
    ['limit too large', { deviceId: DEVICE, limit: 500 }],
    ['non-numeric page', { deviceId: DEVICE, page: 'two' }],
  ])('rejects %s', async (_label, query) => {
    const { app } = await seededApp(1);
    const res = await request(app).get('/api/history').query(query);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_INPUT');
  });

  it('returns HISTORY_UNAVAILABLE when the database is down or not configured', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (const repository of [brokenHistory, null]) {
      const res = await request(createTestApp(undefined, repository)).get('/api/history').query({ deviceId: DEVICE });
      expect(res.status).toBe(503);
      expect(res.body).toEqual({ error: { code: 'HISTORY_UNAVAILABLE' } });
    }
  });
});

describe('GET /api/history/:id', () => {
  it('returns the full saved diagnosis for its own device', async () => {
    const history = new InMemoryHistoryRepository();
    const app = createTestApp(undefined, history);
    const diagnosed = await diagnose(app, { crop: 'sarson', deviceId: DEVICE });
    const id = history.records[0]?.id;

    const res = await request(app).get(`/api/history/${id}`).query({ deviceId: DEVICE });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id,
      crop: 'sarson',
      diagnosis: diagnosed.body.diagnosis,
      createdAt: expect.any(String),
    });
  });

  it("does not show another device's diagnosis", async () => {
    const history = new InMemoryHistoryRepository();
    await history.save({ deviceId: DEVICE, crop: 'bajra', diagnosis: healthyDiagnosis });
    const id = history.records[0]?.id;

    const res = await request(createTestApp(undefined, history)).get(`/api/history/${id}`).query({
      deviceId: OTHER_DEVICE,
    });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns NOT_FOUND for an unknown id and INVALID_INPUT without deviceId', async () => {
    const app = createTestApp(undefined, new InMemoryHistoryRepository());
    const unknown = await request(app).get('/api/history/unknown-id').query({ deviceId: DEVICE });
    const noDevice = await request(app).get('/api/history/unknown-id');

    expect(unknown.status).toBe(404);
    expect(noDevice.status).toBe(400);
  });
});
