import { getDeviceId } from '../utils/deviceId';
import { isRecord, postJson } from './client';

/** "क्या जवाब सही था?" for a saved diagnosis. Sending again changes the answer. */
export async function sendDiagnosisFeedback(historyId: string, helpful: boolean, comment?: string): Promise<void> {
  await postJson(`/api/history/${encodeURIComponent(historyId)}/feedback`, { deviceId: getDeviceId(), helpful, ...(comment && { comment }) }, isRecord);
}
