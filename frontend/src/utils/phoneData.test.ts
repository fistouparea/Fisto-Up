import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { memoryStorage } from '../test/memoryStorage';

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal('localStorage', memoryStorage());
  vi.stubGlobal('sessionStorage', memoryStorage());
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';

describe('changing the person on a shared phone', () => {
  it("forgets the previous person's copies and keeps the phone's settings", async () => {
    localStorage.setItem('agriai.deviceId', A);
    localStorage.setItem(`agriai.cache.${A}:farmProfile`, '{}');
    localStorage.setItem('agriai.readNotifications', '[]');
    localStorage.setItem('agriai.consent.accepted', 'v');
    sessionStorage.setItem('agriai.kitReferrals', '[]');

    const { switchPerson } = await import('./phoneData');
    expect(switchPerson(B)).toBe(true);

    expect(localStorage.getItem('agriai.deviceId')).toBe(B);
    expect(localStorage.getItem(`agriai.cache.${A}:farmProfile`)).toBeNull();
    expect(localStorage.getItem('agriai.readNotifications')).toBeNull();
    expect(sessionStorage.getItem('agriai.kitReferrals')).toBeNull();
    expect(localStorage.getItem('agriai.consent.accepted')).toBe('v');
  });

  it('a late answer of the previous person is not shown to the next one', async () => {
    localStorage.setItem('agriai.deviceId', A);
    const pageOfA = await import('./offlineCache');
    pageOfA.readFromCache('history:page1');
    localStorage.setItem('agriai.deviceId', B);
    pageOfA.saveToCache('history:page1', { items: ['A'] });

    vi.resetModules();
    const pageOfB = await import('./offlineCache');
    expect(pageOfB.readFromCache('history:page1')).toBeNull();
    pageOfB.dropOtherPeoplesCache();
    expect(localStorage.getItem(`agriai.cache.${A}:history:page1`)).toBeNull();
  });

  it('copies saved by the old app version are never shown', async () => {
    localStorage.setItem('agriai.cache.farmProfile', JSON.stringify({ data: 'old', savedAt: 'x' }));
    const cache = await import('./offlineCache');
    expect(cache.readFromCache('farmProfile')).toBeNull();
    cache.dropOtherPeoplesCache();
    expect(localStorage.getItem('agriai.cache.farmProfile')).toBeNull();
  });
});
