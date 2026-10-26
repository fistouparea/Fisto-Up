import { VOICE_INTENT_IDS, VOICE_INTENTS, type VoiceIntentId } from '../../config/voiceIntents.js';
import type { AiProvider } from '../../services/ai/aiProvider.js';
import { redactPersonalData } from '../../services/ai/marketPrompt.js';
import { logger } from '../../observability/logger.js';

export interface IntentResult {
  /** null: not understood; the app answers politely and shows the choices. */
  intent: VoiceIntentId | null;
  source: 'keyword' | 'ai' | 'none';
}

/** Keywords first: the longest matching keyword wins ("मेरी जाँच" is history, not a new check). */
export function matchIntentByKeyword(text: string): VoiceIntentId | null {
  const lower = text.toLowerCase();
  let best: { id: VoiceIntentId; length: number } | null = null;
  for (const id of VOICE_INTENT_IDS) {
    for (const keyword of VOICE_INTENTS[id].keywords) {
      if (lower.includes(keyword) && (!best || keyword.length > best.length)) best = { id, length: keyword.length };
    }
  }
  return best?.id ?? null;
}

/**
 * Maps what the farmer said to one screen. Only the spoken text (phone numbers removed) goes to the AI,
 * never who said it. If the AI fails, the answer is "not understood", never an error for the farmer.
 */
export async function classifyIntent(ai: AiProvider, text: string): Promise<IntentResult> {
  const byKeyword = matchIntentByKeyword(text);
  if (byKeyword) return { intent: byKeyword, source: 'keyword' };
  try {
    const { intent } = await ai.classifyIntent({ text: redactPersonalData(text) });
    return intent ? { intent, source: 'ai' } : { intent: null, source: 'none' };
  } catch (error) {
    logger.warn({ err: error }, 'voice intent: AI failed, answering "not understood"');
    return { intent: null, source: 'none' };
  }
}
