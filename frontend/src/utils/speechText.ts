import type { Diagnosis } from '../api/types';
import { hi } from '../strings/hi';

/** Turns a diagnosis into one text to read aloud, in the same order as the screen. */
export function diagnosisToSpeech(diagnosis: Diagnosis): string {
  const parts = [
    `${hi.sections.problem}: ${diagnosis.problem_name}।`,
    `${hi.sections.cause}: ${diagnosis.explanation}`,
    listToSpeech(hi.sections.desiUpay, diagnosis.desi_upay),
    diagnosis.dawai.length > 0
      ? `${hi.dawaiWarning} ${listToSpeech(
          hi.sections.dawai,
          diagnosis.dawai.map((dawai) => `${dawai.name}। ${dawai.kaise_use_karein}`),
        )}`
      : `${hi.sections.dawai}: ${hi.noDawaiNeeded}`,
    listToSpeech(hi.sections.savdhani, diagnosis.savdhani),
    hi.kvkAdvice,
  ];
  return parts.filter(Boolean).join(' ');
}

function listToSpeech(title: string, items: string[]): string {
  return items.length > 0 ? `${title}: ${items.join(' ')}` : '';
}

/**
 * Splits text into sentences so each is spoken as its own utterance.
 * Some browsers stop long utterances after ~15 seconds.
 */
export function splitIntoSentences(text: string): string[] {
  return text
    .split(/(?<=[।!?.])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

/** Chrome's online Hindi voice stops after ~15 s, about 200 letters at our speed. */
export const MAX_CHUNK_LENGTH = 160;

/** Text as the speaker should say it: amounts in words' order, no emoji, links or formatting marks. */
function speakable(text: string): string {
  const hindi = /[ऀ-ॿ]/.test(text);
  return text
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/₹\s?(\d[\d,]*(?:\.\d+)?)/g, (_, amount: string) => `${amount.replace(/,/g, '')} ${hindi ? 'रुपये' : 'rupees'}`)
    .replace(/\p{Extended_Pictographic}|️|[*_#`•]/gu, ' ')
    .replace(/\s*\n+\s*/g, '। ')
    .replace(/[^\S\n]+/g, ' ')
    .trim();
}

/** Sentences, and long ones cut at a comma or space, short enough that no engine stops in the middle. */
export function toSpeechChunks(text: string): string[] {
  return splitIntoSentences(speakable(text))
    .flatMap(cutLong)
    .filter((chunk) => /[\p{L}\p{N}]/u.test(chunk));
}

function cutLong(sentence: string): string[] {
  const chunks: string[] = [];
  let rest = sentence;
  while (rest.length > MAX_CHUNK_LENGTH) {
    const part = rest.slice(0, MAX_CHUNK_LENGTH);
    const comma = part.lastIndexOf(', ');
    const space = part.lastIndexOf(' ');
    const end = comma > MAX_CHUNK_LENGTH / 2 ? comma + 1 : space > 0 ? space : MAX_CHUNK_LENGTH;
    chunks.push(rest.slice(0, end).trim());
    rest = rest.slice(end).trim();
  }
  return rest ? [...chunks, rest] : chunks;
}
