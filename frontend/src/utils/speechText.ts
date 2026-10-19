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
