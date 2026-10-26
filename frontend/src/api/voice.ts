import { isRecord, postJson } from './client';
import { VOICE_INTENT_IDS, type VoiceIntentId } from '../data/voiceIntents';

export interface IntentResult {
  intent: VoiceIntentId | null;
  source: 'keyword' | 'ai' | 'none';
}

const isIntentResult = (value: unknown): value is IntentResult =>
  isRecord(value) && (value.intent === null || VOICE_INTENT_IDS.some((id) => id === value.intent));

/** "बोलकर चलाएँ": which screen the farmer asked for (null = not understood). */
export function askIntent(text: string): Promise<IntentResult> {
  return postJson('/api/voice/intent', { text }, isIntentResult);
}
