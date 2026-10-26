import { isRecord, postJson } from './client';
import type { ChatMessage, CropId, Diagnosis } from './types';

/** The backend accepts at most this many messages; older ones are dropped here. */
export const MAX_CHAT_MESSAGES = 10;

/** Asks a follow-up question about a diagnosis. `messages` must end with the farmer's question. */
/** `rajasthani`: "जवाब राजस्थानी में" is on (सेटिंग). */
export async function askFollowUp(crop: CropId, diagnosis: Diagnosis, messages: ChatMessage[], rajasthani = false): Promise<string> {
  const body = await postJson(
    '/api/chat',
    { crop, diagnosis, messages: messages.slice(-MAX_CHAT_MESSAGES), ...(rajasthani && { answerLanguage: 'raj' }) },
    isChatResponse,
  );
  return body.answer;
}

function isChatResponse(body: unknown): body is { answer: string } {
  return isRecord(body) && typeof body.answer === 'string';
}
