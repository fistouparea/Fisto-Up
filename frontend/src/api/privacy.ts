import { getDeviceId } from '../utils/deviceId';
import { isRecord, postJson, requestApi } from './client';

/** Must match backend/src/config/privacy.ts. A new version asks every phone for consent again. */
export const CONSENT_VERSION = '2026-10-pilot-1';

export async function sendConsent(lang: 'hi' | 'en'): Promise<void> {
  await postJson('/api/consent', { deviceId: getDeviceId(), version: CONSENT_VERSION, lang }, isRecord);
}

/** Everything the server keeps about this phone (and the logged-in account), as a JSON file. */
export async function fetchMyData(): Promise<Blob> {
  const query = new URLSearchParams({ deviceId: getDeviceId() });
  const data = await requestApi(`/api/account/my-data?${query}`, { method: 'GET' }, isRecord);
  return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
}

export async function deleteMyData(): Promise<void> {
  await postJson('/api/account/my-data/delete', { deviceId: getDeviceId(), confirm: 'DELETE' }, isRecord);
}
