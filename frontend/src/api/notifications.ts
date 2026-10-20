import { getDeviceId } from '../utils/deviceId';
import { isRecord, postJson, requestApi } from './client';
import type { AppNotification, FollowUpAnswer } from './types';

export async function fetchNotifications(): Promise<AppNotification[]> {
  const query = new URLSearchParams({ deviceId: getDeviceId() });
  const body = await requestApi(`/api/notifications?${query}`, { method: 'GET' }, (data): data is { items: AppNotification[] } =>
    isRecord(data) && Array.isArray(data.items),
  );
  return body.items;
}

/** "क्या फसल ठीक हुई?" answer for a past diagnosis. */
export async function answerFollowUp(diagnosisId: string, answer: FollowUpAnswer): Promise<void> {
  await postJson(`/api/history/${encodeURIComponent(diagnosisId)}/follow-up`, { deviceId: getDeviceId(), answer }, isOk);
}

function isOk(body: unknown): body is { ok: true } {
  return isRecord(body) && body.ok === true;
}
