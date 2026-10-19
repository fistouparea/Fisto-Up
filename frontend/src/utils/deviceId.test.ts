import { afterEach, describe, expect, it, vi } from 'vitest';
import { createUuid } from './deviceId';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

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

/** Fresh module per test, because the fallback id is module state. */
async function loadGetDeviceId() {
  vi.resetModules();
  return (await import('./deviceId')).getDeviceId;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createUuid', () => {
  it('creates distinct v4 UUIDs', () => {
    const ids = new Set(Array.from({ length: 100 }, createUuid));
    expect(ids.size).toBe(100);
    for (const id of ids) expect(id).toMatch(UUID_V4);
  });
});

describe('getDeviceId', () => {
  it('creates an id once and reuses it from localStorage', async () => {
    const storage = memoryStorage();
    vi.stubGlobal('localStorage', storage);
    const getDeviceId = await loadGetDeviceId();

    const first = getDeviceId();
    expect(first).toMatch(UUID_V4);
    expect(getDeviceId()).toBe(first);
    expect(storage.getItem('agriai.deviceId')).toBe(first);
  });

  it('replaces a corrupted stored value', async () => {
    const storage = memoryStorage();
    storage.setItem('agriai.deviceId', 'garbage');
    vi.stubGlobal('localStorage', storage);
    const getDeviceId = await loadGetDeviceId();

    expect(getDeviceId()).toMatch(UUID_V4);
  });

  it('still returns a stable id when localStorage throws', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
    });
    const getDeviceId = await loadGetDeviceId();

    const id = getDeviceId();
    expect(id).toMatch(UUID_V4);
    expect(getDeviceId()).toBe(id);
  });
});
