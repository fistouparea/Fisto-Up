import { getDeviceId } from '../utils/deviceId';
import { isRecord, requestApi } from './client';
import type { WaterGuidance } from './types';

export function fetchWater(): Promise<WaterGuidance> {
  const query = new URLSearchParams({ deviceId: getDeviceId() });
  return requestApi(`/api/water?${query}`, { method: 'GET' }, isWaterGuidance);
}

function isWaterGuidance(body: unknown): body is WaterGuidance {
  return isRecord(body) && Array.isArray(body.advice) && Array.isArray(body.tips);
}
