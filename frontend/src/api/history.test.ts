import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchHistory, fetchHistoryRecord, HISTORY_PAGE_SIZE } from './history';

const DEVICE_ID = '1b4e28ba-2fa1-4d2b-a83e-0e7a2d8c1e01';

vi.mock('../utils/deviceId', () => ({ getDeviceId: () => DEVICE_ID }));

function stubFetch(body: unknown, status = 200) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function calledUrl(fetchMock: ReturnType<typeof stubFetch>): URL {
  return new URL((fetchMock.mock.calls[0] as unknown as [string])[0], 'http://app');
}

beforeEach(() => {
  vi.unstubAllGlobals();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('history API', () => {
  it('requests a page of this device history', async () => {
    const fetchMock = stubFetch({ items: [], page: 2, hasMore: false });
    await expect(fetchHistory(2)).resolves.toEqual({ items: [], page: 2, hasMore: false });

    const url = calledUrl(fetchMock);
    expect(url.pathname).toBe('/api/history');
    expect(url.searchParams.get('deviceId')).toBe(DEVICE_ID);
    expect(url.searchParams.get('page')).toBe('2');
    expect(url.searchParams.get('limit')).toBe(String(HISTORY_PAGE_SIZE));
  });

  it('requests one record with the device id', async () => {
    const record = { id: 'abc', crop: 'bajra', diagnosis: {}, createdAt: '2026-10-19T10:00:00Z' };
    const fetchMock = stubFetch(record);
    await expect(fetchHistoryRecord('abc')).resolves.toEqual(record);

    const url = calledUrl(fetchMock);
    expect(url.pathname).toBe('/api/history/abc');
    expect(url.searchParams.get('deviceId')).toBe(DEVICE_ID);
  });

  it('passes HISTORY_UNAVAILABLE through', async () => {
    stubFetch({ error: { code: 'HISTORY_UNAVAILABLE' } }, 503);
    await expect(fetchHistory(1)).rejects.toMatchObject({ code: 'HISTORY_UNAVAILABLE' });
  });
});
