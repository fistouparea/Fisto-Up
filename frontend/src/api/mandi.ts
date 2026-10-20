import { getDeviceId } from '../utils/deviceId';
import { isRecord, requestApi } from './client';
import type { MandiResponse } from './types';

export function fetchMandi(): Promise<MandiResponse> {
  const query = new URLSearchParams({ deviceId: getDeviceId() });
  return requestApi(`/api/mandi?${query}`, { method: 'GET' }, (body): body is MandiResponse =>
    isRecord(body) && typeof body.available === 'boolean' && Array.isArray(body.prices),
  );
}
