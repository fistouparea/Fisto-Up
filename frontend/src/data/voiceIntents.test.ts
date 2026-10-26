import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { hi } from '../strings/hi';
import { VOICE_FALLBACK_CHOICES, VOICE_INTENT_IDS, VOICE_INTENT_SCREENS } from './voiceIntents';

describe('voice intents', () => {
  it('has a screen and a Hindi label for every intent', () => {
    for (const id of VOICE_INTENT_IDS) {
      expect(VOICE_INTENT_SCREENS[id].href.startsWith('#/')).toBe(true);
      expect(hi.voiceMode.intents[id].length).toBeGreaterThan(1);
    }
    expect(VOICE_FALLBACK_CHOICES.every((id) => VOICE_INTENT_IDS.includes(id))).toBe(true);
  });

  it('matches the backend list (backend/src/config/voiceIntents.ts)', () => {
    const backend = readFileSync(new URL('../../../backend/src/config/voiceIntents.ts', import.meta.url), 'utf8');
    const backendIds = [...backend.matchAll(/^ {2}([a-z_]+): \{$/gm)].map((match) => match[1]);
    expect(backendIds.sort()).toEqual([...VOICE_INTENT_IDS].sort());
  });
});
