import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFlag, readFromCache, saveToCache, setFlag } from './offlineCache';

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
    clear: () => data.clear(),
    key: () => null,
    get length() {
      return data.size;
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('offlineCache', () => {
  it('saves data with the time it was saved', () => {
    vi.stubGlobal('localStorage', memoryStorage());
    saveToCache('weather', { temp: 30 });
    const cached = readFromCache<{ temp: number }>('weather');
    expect(cached?.data).toEqual({ temp: 30 });
    expect(Date.parse(cached?.savedAt ?? '')).not.toBeNaN();
  });

  it('returns null for missing or corrupted entries', () => {
    const storage = memoryStorage();
    storage.setItem('agriai.cache.bad', '{not json');
    vi.stubGlobal('localStorage', storage);
    expect(readFromCache('missing')).toBeNull();
    expect(readFromCache('bad')).toBeNull();
  });

  it('never throws when storage is blocked', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });
    expect(() => saveToCache('x', 1)).not.toThrow();
    expect(readFromCache('x')).toBeNull();
    expect(() => setFlag('done')).not.toThrow();
    expect(readFlag('done')).toBe(false);
  });

  it('stores simple flags', () => {
    vi.stubGlobal('localStorage', memoryStorage());
    expect(readFlag('onboardingDone')).toBe(false);
    setFlag('onboardingDone');
    expect(readFlag('onboardingDone')).toBe(true);
  });
});
