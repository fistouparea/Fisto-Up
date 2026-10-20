import { getDeviceId } from '../utils/deviceId';
import { isRecord, postJson, requestApi } from './client';

/** Server's public VAPID key; null when push is not configured. */
export async function fetchPushKey(): Promise<string | null> {
  const body = await requestApi('/api/push/key', { method: 'GET' }, (data): data is { publicKey: string | null } =>
    isRecord(data) && (typeof data.publicKey === 'string' || data.publicKey === null),
  );
  return body.publicKey;
}

export async function saveSubscription(subscription: PushSubscriptionJSON): Promise<void> {
  await postJson('/api/push/subscribe', { deviceId: getDeviceId(), subscription }, (data): data is { ok: true } =>
    isRecord(data) && data.ok === true,
  );
}
