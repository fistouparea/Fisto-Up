import { getJson, isRecord } from './client';

/** Mirrors backend/src/config/featureFlags.ts. */
export const FLAG_KEYS = ['inviteOnly', 'aiFeedback', 'helpRequests', 'voiceInput', 'pilotDashboard', 'voiceMode', 'languages', 'aiKit'] as const;
export type FlagKey = (typeof FLAG_KEYS)[number];
export type Flags = Record<FlagKey, boolean>;

/** Used until the server answered (and offline): the everyday features on, pilot-only ones off. */
export const DEFAULT_FLAGS: Flags = { inviteOnly: false, aiFeedback: true, helpRequests: true, voiceInput: true, pilotDashboard: false, voiceMode: false, languages: false, aiKit: false };

export async function fetchFlags(): Promise<Flags> {
  const body = await getJson('/api/account/flags', (value): value is { flags: Record<string, unknown> } => isRecord(value) && isRecord(value.flags));
  return Object.fromEntries(FLAG_KEYS.map((key) => [key, typeof body.flags[key] === 'boolean' ? body.flags[key] : DEFAULT_FLAGS[key]])) as Flags;
}
