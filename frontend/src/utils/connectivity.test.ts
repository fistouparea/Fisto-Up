import { afterEach, describe, expect, it, vi } from 'vitest';

async function freshModule() {
  vi.resetModules();
  return import('./connectivity');
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('connectivity', () => {
  it('goes offline on a network failure and back online when the server answers', async () => {
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() });
    const connectivity = await freshModule();
    const listener = vi.fn();
    connectivity.subscribeConnectivity(listener);

    connectivity.reportNetworkFailure();
    expect(connectivity.getConnectivity().offline).toBe(true);

    connectivity.reportServerReached();
    expect(connectivity.getConnectivity().offline).toBe(false);
    expect(Date.parse(connectivity.getConnectivity().lastSync ?? '')).not.toBeNaN();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('remembers the last update time across reloads', async () => {
    vi.stubGlobal('localStorage', { getItem: () => '2026-10-20T05:00:00.000Z', setItem: vi.fn() });
    const connectivity = await freshModule();
    expect(connectivity.getConnectivity().lastSync).toBe('2026-10-20T05:00:00.000Z');
  });
});

describe('API client reports reachability', () => {
  it('marks offline when fetch fails and online when any response arrives', async () => {
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() });
    vi.resetModules();
    const connectivity = await import('../utils/connectivity');
    const { requestApi } = await import('../api/client');
    const isAny = (body: unknown): body is unknown => body !== undefined;

    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))));
    await expect(requestApi('/api/x', {}, isAny)).rejects.toMatchObject({ code: 'NETWORK' });
    expect(connectivity.getConnectivity().offline).toBe(true);

    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { code: 'NOT_FOUND' } }), { status: 404 })));
    await expect(requestApi('/api/x', {}, isAny)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(connectivity.getConnectivity().offline).toBe(false);
  });
});
