import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { DIAGNOSIS_SYSTEM_PROMPT } from '../src/services/ai/prompt.js';
import { createFakeProvider, createTestApp, healthyDiagnosis, JPEG_BYTES } from './helpers.js';
import { InMemoryHistoryRepository } from './inMemoryHistoryRepository.js';

function diagnose(app: ReturnType<typeof createTestApp>, deviceId?: string) {
  const req = request(app).post('/api/diagnose').field('crop', 'bajra');
  if (deviceId) req.field('deviceId', deviceId);
  return req.attach('image', JPEG_BYTES, { filename: 'leaf.jpg', contentType: 'image/jpeg' });
}

describe('severity', () => {
  it.each(['healthy', 'mild', 'serious'] as const)('passes "%s" through to the farmer', async (severity) => {
    const res = await diagnose(createTestApp(createFakeProvider({ ...healthyDiagnosis, severity })));
    expect(res.body.diagnosis.severity).toBe(severity);
  });

  it('still works when the AI gives no severity', async () => {
    const res = await diagnose(createTestApp(createFakeProvider(healthyDiagnosis)));
    expect(res.status).toBe(200);
    expect(res.body.diagnosis).not.toHaveProperty('severity');
  });

  it('is saved and shown in the history list', async () => {
    const history = new InMemoryHistoryRepository();
    const deviceId = randomUUID();
    const app = createTestApp(createFakeProvider({ ...healthyDiagnosis, severity: 'serious' }), history);
    await diagnose(app, deviceId);

    const res = await request(app).get('/api/history').query({ deviceId });
    expect(res.body.items[0].severity).toBe('serious');
  });

  it('is explained in the prompt, erring on the serious side', () => {
    expect(DIAGNOSIS_SYSTEM_PROMPT).toContain('severity');
    expect(DIAGNOSIS_SYSTEM_PROMPT).toContain('choose the more serious one');
  });
});
