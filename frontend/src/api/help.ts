import { getDeviceId } from '../utils/deviceId';
import { isRecord, postJson } from './client';

/** Mirrors backend/src/modules/help/help.model.ts. */
export const HELP_CATEGORIES = ['crop', 'app', 'order', 'payment', 'account', 'other'] as const;
export type HelpCategory = (typeof HELP_CATEGORIES)[number];

export async function sendHelpRequest(input: { category: HelpCategory; message: string; callbackPhone?: string }): Promise<void> {
  await postJson('/api/account/help', { deviceId: getDeviceId(), ...input }, isRecord);
}
