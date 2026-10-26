import { createHash } from 'node:crypto';
import { buildListingUserPrompt, buildPriceEstimatePrompt, LISTING_SYSTEM_PROMPT, PRICE_ESTIMATE_SYSTEM_PROMPT } from './marketPrompt.js';
import { buildIntentUserPrompt, INTENT_SYSTEM_PROMPT } from './voicePrompt.js';
import { buildChatSystemPrompt, buildDiagnosisUserPrompt, DIAGNOSIS_SYSTEM_PROMPT } from './prompt.js';

/**
 * Every AI prompt has a version name. Changing a prompt's text means: bump its version here, then run
 * `npm run prompts:snapshot` (writes eval/prompts/<version>.txt and prompts.lock.json). A test fails if the text
 * changed without a new version, so every eval report (which records the version) can be compared fairly.
 */
const SAMPLE_DIAGNOSIS = { problem_name: '<problem>', explanation: '<explanation>', desi_upay: [], dawai: [], savdhani: [] };

export const PROMPTS = {
  diagnosis: {
    version: 'diagnosis-v1',
    text: () => `${DIAGNOSIS_SYSTEM_PROMPT}\n\n--- user ---\n${buildDiagnosisUserPrompt('<crop>')}`,
  },
  chat: { version: 'chat-v2', text: () => buildChatSystemPrompt('<crop>', SAMPLE_DIAGNOSIS) },
  listing: { version: 'listing-v1', text: () => `${LISTING_SYSTEM_PROMPT}\n\n--- user ---\n${buildListingUserPrompt('<seller words>')}` },
  intent: { version: 'intent-v3', text: () => `${INTENT_SYSTEM_PROMPT}\n\n--- user ---\n${buildIntentUserPrompt('<farmer words>')}` },
  priceEstimate: { version: 'price-v1', text: () => `${PRICE_ESTIMATE_SYSTEM_PROMPT}\n\n--- user ---\n${buildPriceEstimatePrompt('<product>', '<unit>')}` },
} as const;

export type PromptName = keyof typeof PROMPTS;
export const PROMPT_NAMES = Object.keys(PROMPTS) as PromptName[];

/** Short content hash: two reports with the same fingerprint used exactly the same prompt text. */
export function promptFingerprint(name: PromptName): string {
  return createHash('sha256').update(PROMPTS[name].text()).digest('hex').slice(0, 12);
}

export function promptInfo(name: PromptName): { version: string; fingerprint: string } {
  return { version: PROMPTS[name].version, fingerprint: promptFingerprint(name) };
}
