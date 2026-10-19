import { getDeviceId } from '../utils/deviceId';
import { isRecord, requestApi } from './client';
import type { HistoryPage, HistoryRecord } from './types';

export const HISTORY_PAGE_SIZE = 10;

/** Past diagnoses of this phone, latest first. */
export function fetchHistory(page: number): Promise<HistoryPage> {
  const query = new URLSearchParams({ deviceId: getDeviceId(), page: String(page), limit: String(HISTORY_PAGE_SIZE) });
  return requestApi(`/api/history?${query}`, { method: 'GET' }, isHistoryPage);
}

export function fetchHistoryRecord(id: string): Promise<HistoryRecord> {
  const query = new URLSearchParams({ deviceId: getDeviceId() });
  return requestApi(`/api/history/${encodeURIComponent(id)}?${query}`, { method: 'GET' }, isHistoryRecord);
}

function isHistoryPage(body: unknown): body is HistoryPage {
  return isRecord(body) && Array.isArray(body.items) && typeof body.hasMore === 'boolean';
}

function isHistoryRecord(body: unknown): body is HistoryRecord {
  return isRecord(body) && typeof body.id === 'string' && isRecord(body.diagnosis);
}
