import { describe, expect, it } from 'vitest';
import { loadEnv, marketConfig } from '../../src/config/env.js';

const base = { GEMINI_API_KEY: 'k', GEMINI_MODEL: 'm' };
const secret = 'a'.repeat(32);

describe('marketplace config', () => {
  it('is off without MongoDB or without a JWT secret (empty values count as not set)', () => {
    expect(marketConfig(loadEnv({ ...base, JWT_SECRET: secret }))).toBeNull();
    expect(marketConfig(loadEnv({ ...base, MONGO_URI: 'mongodb://x', JWT_SECRET: '' }))).toBeNull();
  });

  it('defaults to 3% commission and a secure cookie in production', () => {
    const config = marketConfig(loadEnv({ ...base, MONGO_URI: 'mongodb://x', JWT_SECRET: secret, NODE_ENV: 'production', CORS_ORIGIN: 'https://agriai.example.com' }));
    expect(config).toEqual({ jwtSecret: secret, cookieSecure: true, commissionBps: 300 });
  });

  it('reads COMMISSION_PERCENT and COOKIE_SECURE', () => {
    const config = marketConfig(
      loadEnv({ ...base, MONGO_URI: 'mongodb://x', JWT_SECRET: secret, COMMISSION_PERCENT: '2.5', COOKIE_SECURE: 'false' }),
    );
    expect(config).toMatchObject({ commissionBps: 250, cookieSecure: false });
  });

  it.each(['1.9', '5.1', 'abc'])('refuses COMMISSION_PERCENT=%s (allowed 2-5)', (value) => {
    expect(() => loadEnv({ ...base, COMMISSION_PERCENT: value })).toThrow(/COMMISSION_PERCENT/);
  });

  it('refuses a short JWT secret', () => {
    expect(() => loadEnv({ ...base, JWT_SECRET: 'short' })).toThrow(/JWT_SECRET/);
  });
});
