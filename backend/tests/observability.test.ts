import { Writable } from 'node:stream';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { createLogger } from '../src/observability/logger.js';
import { maskPersonalText } from '../src/observability/redact.js';
import { fetchWithRetry } from '../src/utils/http.js';
import { createFakeProvider, createTestApp } from './helpers.js';

describe('health endpoints', () => {
  it('/health answers 200 while the process runs, without hitting rate limits or the database', async () => {
    const res = await request(createTestApp()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('/ready answers 503 with the failing check when the database is down, 200 when it is up', async () => {
    let database: 'ok' | 'down' = 'down';
    const app = createApp({
      aiProvider: createFakeProvider(),
      historyRepository: null,
      corsOrigins: ['http://localhost:5173'],
      readiness: async () => ({ status: database === 'ok' ? 'ok' : 'down', checks: { database } }),
    });
    const down = await request(app).get('/ready');
    expect(down.status).toBe(503);
    expect(down.body).toEqual({ status: 'down', checks: { database: 'down' } });

    database = 'ok';
    expect((await request(app).get('/api/ready')).status).toBe(200);
  });
});

describe('request ids', () => {
  it('every response carries an id; a sane id from the proxy is kept, a strange one replaced', async () => {
    const app = createTestApp();
    const fresh = await request(app).get('/api/health');
    expect(fresh.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);

    const kept = await request(app).get('/api/health').set('X-Request-Id', 'render-abc12345');
    expect(kept.headers['x-request-id']).toBe('render-abc12345');

    const replaced = await request(app).get('/api/health').set('X-Request-Id', '<script>alert(1)</script>');
    expect(replaced.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe('logs never contain personal data', () => {
  function captureLogger() {
    const lines: string[] = [];
    const sink = new Writable({
      write(chunk: Buffer, _encoding, done) {
        lines.push(chunk.toString());
        done();
      },
    });
    return { lines, sink };
  }

  it('removes PINs, phones, tokens and photos by field, and masks phones inside error messages', () => {
    const { lines, sink } = captureLogger();
    const logger = createLogger('info', false, sink);
    logger.info({ body: { pin: '4826', phone: '9876543210', token: 'eyJ.x.y', image: 'AAAA' } }, 'login');
    logger.error({ err: new Error('E11000 dup key: { phone: "9876543210" }') }, 'register failed');
    const written = lines.join('');
    expect(written).not.toMatch(/4826|9876543210|eyJ|AAAA/);
    expect(written).toContain('[redacted]');
    expect(written).toContain('[phone]');

    expect(maskPersonalText('E11000 duplicate key error dup key: { phone: "9876543210" }')).toBe('E11000 duplicate key error dup key: { phone: "[phone]" }');
    expect(maskPersonalText('connect failed mongodb+srv://agri:S3cret@cluster0.x.mongodb.net/agriai')).toBe(
      'connect failed mongodb+srv://[credentials]@cluster0.x.mongodb.net/agriai',
    );
  });
});

describe('fetchWithRetry (weather, mandi)', () => {
  const sleep = vi.fn(async () => undefined);

  it('retries once on 503 or a network error, then succeeds', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('busy', { status: 503 }))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));
    expect((await fetchWithRetry(fetchFn, 'https://x.example', { timeoutMs: 1000, sleep })).status).toBe(200);
    expect(fetchFn).toHaveBeenCalledTimes(2);

    const flaky = vi.fn<typeof fetch>().mockRejectedValueOnce(new TypeError('fetch failed')).mockResolvedValueOnce(new Response('ok'));
    expect((await fetchWithRetry(flaky, 'https://x.example', { timeoutMs: 1000, sleep })).status).toBe(200);
  });

  it('does not retry a timeout or a 4xx answer', async () => {
    const slow = vi.fn<typeof fetch>().mockRejectedValue(new DOMException('timed out', 'TimeoutError'));
    await expect(fetchWithRetry(slow, 'https://x.example', { timeoutMs: 1000, sleep })).rejects.toThrow('timed out');
    expect(slow).toHaveBeenCalledTimes(1);

    const notFound = vi.fn<typeof fetch>().mockResolvedValue(new Response('no', { status: 404 }));
    expect((await fetchWithRetry(notFound, 'https://x.example', { timeoutMs: 1000, sleep })).status).toBe(404);
    expect(notFound).toHaveBeenCalledTimes(1);
  });

  it('gives up after the last attempt', async () => {
    const down = vi.fn<typeof fetch>().mockResolvedValue(new Response('down', { status: 500 }));
    await expect(fetchWithRetry(down, 'https://x.example', { timeoutMs: 1000, maxAttempts: 3, sleep })).rejects.toThrow('HTTP 500');
    expect(down).toHaveBeenCalledTimes(3);
  });
});
