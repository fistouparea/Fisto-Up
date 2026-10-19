import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from './client';
import { diagnoseCrop } from './diagnose';

const photo = new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: 'image/jpeg' });

function mockFetch(implementation: () => Promise<Response>) {
  const fetchMock = vi.fn(implementation);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }));
}

async function expectErrorCode(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toBeInstanceOf(ApiError);
  await expect(promise).rejects.toMatchObject({ code });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('diagnoseCrop', () => {
  it('posts the crop and photo as multipart form data', async () => {
    const fetchMock = mockFetch(() => jsonResponse({ status: 'unclear' }));
    await diagnoseCrop('bajra', photo);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/diagnose');
    expect(init.method).toBe('POST');
    const form = init.body as FormData;
    expect(form.get('crop')).toBe('bajra');
    expect(form.get('image')).toBeInstanceOf(Blob);
  });

  it('returns ok and unclear responses', async () => {
    const diagnosis = { problem_name: 'x', explanation: 'y', desi_upay: [], dawai: [], savdhani: [] };
    mockFetch(() => jsonResponse({ status: 'ok', diagnosis }));
    await expect(diagnoseCrop('guar', photo)).resolves.toEqual({ status: 'ok', diagnosis });

    mockFetch(() => jsonResponse({ status: 'unclear' }));
    await expect(diagnoseCrop('guar', photo)).resolves.toEqual({ status: 'unclear' });
  });

  it('passes through known backend error codes', async () => {
    mockFetch(() => jsonResponse({ error: { code: 'RATE_LIMITED' } }, 429));
    await expectErrorCode(diagnoseCrop('chana', photo), 'RATE_LIMITED');
  });

  it('treats unknown error codes and non-JSON bodies as UNKNOWN', async () => {
    mockFetch(() => jsonResponse({ error: { code: 'SOMETHING_NEW' } }, 500));
    await expectErrorCode(diagnoseCrop('chana', photo), 'UNKNOWN');

    mockFetch(() => Promise.resolve(new Response('<html>Bad gateway</html>', { status: 502 })));
    await expectErrorCode(diagnoseCrop('chana', photo), 'UNKNOWN');
  });

  it('rejects a 200 response with an unexpected shape', async () => {
    mockFetch(() => jsonResponse({ hello: 'world' }));
    await expectErrorCode(diagnoseCrop('chana', photo), 'UNKNOWN');
  });

  it('maps a failed connection to NETWORK and a timeout to AI_TIMEOUT', async () => {
    mockFetch(() => Promise.reject(new TypeError('Failed to fetch')));
    await expectErrorCode(diagnoseCrop('moth', photo), 'NETWORK');

    mockFetch(() => Promise.reject(new DOMException('timed out', 'TimeoutError')));
    await expectErrorCode(diagnoseCrop('moth', photo), 'AI_TIMEOUT');
  });
});
