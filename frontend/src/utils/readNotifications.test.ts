import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadReadIds, saveReadIds } from './readNotifications';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('read notifications', () => {
  it('round-trips ids and survives bad or blocked storage', () => {
    const data = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => data.set(k, v) });
    saveReadIds(new Set(['a', 'b']));
    expect(loadReadIds()).toEqual(new Set(['a', 'b']));

    data.set('agriai.readNotifications', '{bad');
    expect(loadReadIds()).toEqual(new Set());

    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });
    expect(loadReadIds()).toEqual(new Set());
    expect(() => saveReadIds(new Set(['x']))).not.toThrow();
  });
});
