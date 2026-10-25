import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { loadEnv } from '../src/config/env.js';
import { RATE_LIMITS } from '../src/config/securityRules.js';
import { createTestApp } from './helpers.js';

describe('security headers', () => {
  it('sends a locked-down CSP and the usual helmet headers, and hides the framework', async () => {
    const res = await request(createTestApp()).get('/api/health');
    expect(res.headers['content-security-policy']).toBe("default-src 'none';frame-ancestors 'none';base-uri 'none';form-action 'none'");
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['strict-transport-security']).toMatch(/max-age=\d+/);
    expect(res.headers['referrer-policy']).toBe('no-referrer');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('CORS', () => {
  it('allows only the configured frontend origin, with credentials', async () => {
    const app = createTestApp();
    const ours = await request(app).options('/api/chat').set('Origin', 'http://localhost:5173').set('Access-Control-Request-Method', 'POST');
    expect(ours.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(ours.headers['access-control-allow-credentials']).toBe('true');

    const evil = await request(app).options('/api/chat').set('Origin', 'https://evil.example').set('Access-Control-Request-Method', 'POST');
    expect(evil.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('request size limits', () => {
  it('refuses a JSON body above the route limit without reading it into the app', async () => {
    const huge = { crop: 'bajra', diagnosis: {}, messages: [{ role: 'user', text: 'x'.repeat(40_000) }] };
    const res = await request(createTestApp()).post('/api/chat').send(huge);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: { code: 'INVALID_INPUT' } });
  });
});

describe('rate limits per route type', () => {
  it(`allows ${RATE_LIMITS.writes.limit} writes a minute per IP, then answers 429 RATE_LIMITED`, async () => {
    const app = createTestApp();
    // Invalid bodies are fine: the write limit counts every write before validation.
    for (let i = 0; i < RATE_LIMITS.writes.limit; i++) {
      expect((await request(app).post('/api/push/subscribe').send({})).status).not.toBe(429);
    }
    const blocked = await request(app).post('/api/push/subscribe').send({});
    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({ error: { code: 'RATE_LIMITED' } });
    // Reads have their own, larger budget.
    expect((await request(app).get('/api/health')).status).toBe(200);
  });
});

describe('startup config (env)', () => {
  const base = { GEMINI_API_KEY: 'k', GEMINI_MODEL: 'm' };
  const production = {
    ...base,
    NODE_ENV: 'production',
    CORS_ORIGIN: 'https://agriai.example.com',
    MONGO_URI: 'mongodb+srv://user:pass@cluster.example.net/agriai',
    JWT_SECRET: 'x'.repeat(32),
  };

  it('accepts a complete production config', () => {
    expect(loadEnv(production).CORS_ORIGIN).toEqual(['https://agriai.example.com']);
  });

  it.each(['CORS_ORIGIN', 'MONGO_URI', 'JWT_SECRET'] as const)('refuses to start in production without %s', (key) => {
    const { [key]: _removed, ...rest } = production;
    expect(() => loadEnv(rest)).toThrow(new RegExp(`${key}: required in production`));
  });

  it.each(['*', 'https://agriai.example.com/app', 'agriai.example.com', 'ftp://x.example'])('refuses CORS_ORIGIN=%s', (origin) => {
    expect(() => loadEnv({ ...base, CORS_ORIGIN: origin })).toThrow(/CORS_ORIGIN/);
  });

  it('refuses an unknown NODE_ENV', () => {
    expect(() => loadEnv({ ...base, NODE_ENV: 'prod' })).toThrow(/NODE_ENV/);
  });

  it('the error message names the problem but never prints a secret value', () => {
    const attempt = () => loadEnv({ ...base, JWT_SECRET: 'tooShortSecret' });
    expect(attempt).toThrow(/JWT_SECRET/);
    expect(attempt).not.toThrow(/tooShortSecret/);
  });
});
