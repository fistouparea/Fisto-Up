import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchFarmProfile, markCropWatered, saveFarmProfile } from './farm';

const DEVICE_ID = '1b4e28ba-2fa1-4d2b-a83e-0e7a2d8c1e01';
vi.mock('../utils/deviceId', () => ({ getDeviceId: () => DEVICE_ID }));

const profile = { crops: [{ crop: 'chana', sowingDate: '2026-10-01' }], irrigation: 'canal' };

function stubFetch(body: unknown, status = 200) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function call(fetchMock: ReturnType<typeof stubFetch>) {
  return fetchMock.mock.calls[0] as unknown as [string, RequestInit];
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('farm API', () => {
  it('loads the profile for this device (null when not filled)', async () => {
    const fetchMock = stubFetch({ profile: null });
    await expect(fetchFarmProfile()).resolves.toBeNull();
    expect(call(fetchMock)[0]).toBe(`/api/profile?deviceId=${DEVICE_ID}`);
  });

  it('saves with PUT and the device id', async () => {
    const fetchMock = stubFetch({ profile });
    await expect(saveFarmProfile({ crops: [], irrigation: 'canal' })).resolves.toEqual(profile);
    const [url, init] = call(fetchMock);
    expect(url).toBe('/api/profile');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body as string)).toEqual({ deviceId: DEVICE_ID, profile: { crops: [], irrigation: 'canal' } });
  });

  it('records watering for one crop', async () => {
    const fetchMock = stubFetch({ profile });
    await markCropWatered('chana');
    expect(JSON.parse(call(fetchMock)[1].body as string)).toEqual({ deviceId: DEVICE_ID, crop: 'chana' });
  });

  it('passes STORAGE_UNAVAILABLE through', async () => {
    stubFetch({ error: { code: 'STORAGE_UNAVAILABLE' } }, 503);
    await expect(fetchFarmProfile()).rejects.toMatchObject({ code: 'STORAGE_UNAVAILABLE' });
  });
});
