import { getDeviceId } from '../utils/deviceId';
import { isRecord, requestApi } from './client';
import type { CropStageInfo } from './types';

export function fetchCalendar(): Promise<{ crops: CropStageInfo[] }> {
  const query = new URLSearchParams({ deviceId: getDeviceId() });
  return requestApi(`/api/calendar?${query}`, { method: 'GET' }, (body): body is { crops: CropStageInfo[] } =>
    isRecord(body) && Array.isArray(body.crops),
  );
}
