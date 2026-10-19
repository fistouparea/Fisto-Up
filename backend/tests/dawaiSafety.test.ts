import { describe, expect, it } from 'vitest';
import { SYSTEM_PROMPT } from '../src/services/ai/prompt.js';
import { PACKET_DOSE_NOTE, withPacketDoseNote } from '../src/services/dawaiSafety.js';
import type { Diagnosis } from '../src/types/diagnosis.js';

const base: Diagnosis = { problem_name: 'रोग', explanation: 'कारण', desi_upay: [], dawai: [], savdhani: [] };

describe('withPacketDoseNote', () => {
  it('adds the packet-dose note to every medicine that lacks it', () => {
    const result = withPacketDoseNote({
      ...base,
      dawai: [
        { name: 'मैंकोजेब', kaise_use_karein: 'शाम को छिड़कें।' },
        { name: 'नीम तेल', kaise_use_karein: `हफ्ते में एक बार। ${PACKET_DOSE_NOTE}` },
      ],
    });

    expect(result.dawai[0]?.kaise_use_karein).toBe(`शाम को छिड़कें। ${PACKET_DOSE_NOTE}`);
    expect(result.dawai[1]?.kaise_use_karein).toBe(`हफ्ते में एक बार। ${PACKET_DOSE_NOTE}`);
  });
});

describe('system prompt medicine rules', () => {
  it('asks for generic names, the packet note, no banned pesticides and KVK when unsure', () => {
    expect(SYSTEM_PROMPT).toContain('generic name');
    expect(SYSTEM_PROMPT).toContain('Never name or promote a brand');
    expect(SYSTEM_PROMPT).toContain(PACKET_DOSE_NOTE);
    expect(SYSTEM_PROMPT).toContain('banned');
    expect(SYSTEM_PROMPT).toContain('KVK');
  });
});
