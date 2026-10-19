import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { AppError } from '../src/errors/AppError.js';
import { MAX_IMAGE_BYTES } from '../src/types/diagnosis.js';
import { createFakeProvider, createTestApp, healthyDiagnosis, JPEG_BYTES } from './helpers.js';

function postDiagnose(app: ReturnType<typeof createTestApp>) {
  return request(app).post('/api/diagnose');
}

describe('POST /api/diagnose', () => {
  it('returns the diagnosis without internal confidence fields', async () => {
    const provider = createFakeProvider();
    const res = await postDiagnose(createTestApp(provider))
      .field('crop', 'bajra')
      .attach('image', JPEG_BYTES, { filename: 'leaf.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(200);
    const { is_plant_image: _p, confidence: _c, ...expected } = healthyDiagnosis;
    expect(res.body).toEqual({ status: 'ok', diagnosis: expected });
  });

  it('sends only the image, its type and the crop name to the AI', async () => {
    const provider = createFakeProvider();
    await postDiagnose(createTestApp(provider))
      .field('crop', 'sarson')
      .attach('image', JPEG_BYTES, { filename: 'leaf.jpg', contentType: 'image/jpeg' });

    expect(provider.diagnose).toHaveBeenCalledOnce();
    const input = provider.diagnose.mock.calls[0]?.[0];
    expect(Object.keys(input ?? {}).sort()).toEqual(['cropName', 'image', 'mimeType']);
    expect(input?.cropName).toContain('सरसों');
    expect(input?.mimeType).toBe('image/jpeg');
  });

  it.each([
    ['not a plant', { ...healthyDiagnosis, is_plant_image: false }],
    ['low confidence', { ...healthyDiagnosis, confidence: 'low' as const }],
    ['empty problem name', { ...healthyDiagnosis, problem_name: '' }],
  ])('returns "unclear" and no guess when %s', async (_label, aiResult) => {
    const res = await postDiagnose(createTestApp(createFakeProvider(aiResult)))
      .field('crop', 'chana')
      .attach('image', JPEG_BYTES, { filename: 'leaf.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'unclear' });
  });

  it('accepts medium confidence', async () => {
    const res = await postDiagnose(createTestApp(createFakeProvider({ ...healthyDiagnosis, confidence: 'medium' })))
      .field('crop', 'guar')
      .attach('image', JPEG_BYTES, { filename: 'leaf.jpg', contentType: 'image/jpeg' });

    expect(res.body.status).toBe('ok');
  });

  it('rejects a missing crop', async () => {
    const res = await postDiagnose(createTestApp()).attach('image', JPEG_BYTES, {
      filename: 'leaf.jpg',
      contentType: 'image/jpeg',
    });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: { code: 'INVALID_INPUT' } });
  });

  it('rejects an unknown crop', async () => {
    const res = await postDiagnose(createTestApp())
      .field('crop', 'banana')
      .attach('image', JPEG_BYTES, { filename: 'leaf.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_INPUT');
  });

  it('rejects a request without an image', async () => {
    const res = await postDiagnose(createTestApp()).field('crop', 'bajra');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_IMAGE');
  });

  it('rejects a non-image file that claims to be a JPEG, without calling the AI', async () => {
    const provider = createFakeProvider();
    const res = await postDiagnose(createTestApp(provider))
      .field('crop', 'bajra')
      .attach('image', Buffer.from('<script>alert(1)</script>'), { filename: 'x.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_IMAGE');
    expect(provider.diagnose).not.toHaveBeenCalled();
  });

  it('rejects images larger than 5 MB', async () => {
    const provider = createFakeProvider();
    const bigImage = Buffer.concat([JPEG_BYTES, Buffer.alloc(MAX_IMAGE_BYTES)]);
    const res = await postDiagnose(createTestApp(provider))
      .field('crop', 'bajra')
      .attach('image', bigImage, { filename: 'big.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('FILE_TOO_LARGE');
    expect(provider.diagnose).not.toHaveBeenCalled();
  });

  it.each([
    ['RATE_LIMITED', 429],
    ['AI_TIMEOUT', 504],
    ['AI_ERROR', 502],
  ] as const)('maps provider error %s to HTTP %i', async (code, status) => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = await postDiagnose(createTestApp(createFakeProvider(new AppError(code))))
      .field('crop', 'bajra')
      .attach('image', JPEG_BYTES, { filename: 'leaf.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(status);
    expect(res.body).toEqual({ error: { code } });
  });

  it('hides internal details of unexpected errors', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = await postDiagnose(createTestApp(createFakeProvider(new Error('secret db password in stack'))))
      .field('crop', 'bajra')
      .attach('image', JPEG_BYTES, { filename: 'leaf.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: { code: 'INTERNAL' } });
    expect(res.text).not.toContain('secret');
  });
});

describe('other routes', () => {
  it('reports health', async () => {
    const res = await request(createTestApp()).get('/api/health');
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('returns NOT_FOUND for unknown routes', async () => {
    const res = await request(createTestApp()).get('/api/unknown');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: 'NOT_FOUND' } });
  });

  it('allows CORS only for the configured frontend origin', async () => {
    const allowed = await request(createTestApp()).get('/api/health').set('Origin', 'http://localhost:5173');
    const blocked = await request(createTestApp()).get('/api/health').set('Origin', 'http://evil.example');

    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(blocked.headers['access-control-allow-origin']).toBeUndefined();
  });
});
