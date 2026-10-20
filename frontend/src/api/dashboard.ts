import { getDeviceId } from '../utils/deviceId';
import { isRecord, requestApi } from './client';
import type { Dashboard } from './types';

export function fetchDashboard(): Promise<Dashboard> {
  const query = new URLSearchParams({ deviceId: getDeviceId() });
  return requestApi(`/api/dashboard?${query}`, { method: 'GET' }, isDashboard);
}

function isDashboard(body: unknown): body is Dashboard {
  return (
    isRecord(body) &&
    typeof body.hasProfile === 'boolean' &&
    Array.isArray(body.alerts) &&
    Array.isArray(body.tasks) &&
    Array.isArray(body.water) &&
    Array.isArray(body.followUps)
  );
}
