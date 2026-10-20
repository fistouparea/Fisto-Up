import { describe, expect, it } from 'vitest';
import { loadEnv } from '../src/config/env.js';
import { detectImageType } from '../src/middleware/validateImage.js';
import { backoffDelay } from '../src/services/ai/retry.js';

describe('detectImageType', () => {
  it('recognises JPEG, PNG and WebP by their bytes', () => {
    expect(detectImageType(Buffer.from([0xff, 0xd8, 0xff, 0xdb]))).toBe('image/jpeg');
    expect(detectImageType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('image/png');
    expect(detectImageType(Buffer.from('RIFF\0\0\0\0WEBPVP8 ', 'ascii'))).toBe('image/webp');
  });

  it('rejects anything else', () => {
    expect(detectImageType(Buffer.from('GIF89a'))).toBeNull();
    expect(detectImageType(Buffer.alloc(0))).toBeNull();
  });
});

describe('backoffDelay', () => {
  it('doubles each attempt, with at most 25% jitter', () => {
    for (const [attempt, base] of [[1, 1000], [2, 2000], [3, 4000]] as const) {
      const delay = backoffDelay(attempt, 1000);
      expect(delay).toBeGreaterThanOrEqual(base);
      expect(delay).toBeLessThanOrEqual(base * 1.25);
    }
  });
});

describe('loadEnv', () => {
  it('fails fast when the API key is missing', () => {
    expect(() => loadEnv({ GEMINI_MODEL: 'm' })).toThrow(/GEMINI_API_KEY/);
  });

  it('applies defaults and splits CORS origins', () => {
    const env = loadEnv({ GEMINI_API_KEY: 'k', GEMINI_MODEL: 'm', CORS_ORIGIN: 'http://a, http://b' });
    expect(env.PORT).toBe(4000);
    expect(env.AI_PROVIDER).toBe('gemini');
    expect(env.CORS_ORIGIN).toEqual(['http://a', 'http://b']);
    expect(env.TRUST_PROXY).toBe(0);
    expect(env.MONGO_URI).toBeUndefined();
  });
});

describe('vapidConfig', () => {
  it('enables push only when all three VAPID values are set', async () => {
    const { vapidConfig } = await import('../src/config/env.js');
    const base = loadEnv({ GEMINI_API_KEY: 'k', GEMINI_MODEL: 'm' });
    expect(vapidConfig(base)).toBeNull();
    expect(vapidConfig({ ...base, VAPID_PUBLIC_KEY: 'pub', VAPID_PRIVATE_KEY: 'priv' })).toBeNull();
    expect(vapidConfig({ ...base, VAPID_PUBLIC_KEY: 'pub', VAPID_PRIVATE_KEY: 'priv', VAPID_SUBJECT: 'mailto:a@b.c' })).toEqual({
      publicKey: 'pub',
      privateKey: 'priv',
      subject: 'mailto:a@b.c',
    });
  });

  it('rejects a VAPID subject that is not mailto: or https:', () => {
    expect(() => loadEnv({ GEMINI_API_KEY: 'k', GEMINI_MODEL: 'm', VAPID_SUBJECT: 'me@example.com' })).toThrow(/VAPID_SUBJECT/);
  });
});
