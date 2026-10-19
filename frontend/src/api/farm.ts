import { getDeviceId } from '../utils/deviceId';
import { isRecord, postJson, requestApi } from './client';
import type { CropId, FarmProfile } from './types';

interface ProfileResponse {
  profile: FarmProfile | null;
}

export async function fetchFarmProfile(): Promise<FarmProfile | null> {
  const query = new URLSearchParams({ deviceId: getDeviceId() });
  return (await requestApi(`/api/profile?${query}`, { method: 'GET' }, isProfileResponse)).profile;
}

export async function saveFarmProfile(profile: FarmProfile): Promise<FarmProfile> {
  const body = await requestApi(
    '/api/profile',
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: getDeviceId(), profile }),
    },
    isProfileResponse,
  );
  return body.profile ?? profile;
}

/** "आज पानी दिया" for one crop. */
export async function markCropWatered(crop: CropId): Promise<FarmProfile | null> {
  return (await postJson('/api/profile/watered', { deviceId: getDeviceId(), crop }, isProfileResponse)).profile;
}

function isProfileResponse(body: unknown): body is ProfileResponse {
  return isRecord(body) && (body.profile === null || (isRecord(body.profile) && Array.isArray(body.profile.crops)));
}
