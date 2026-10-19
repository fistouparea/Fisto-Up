import type { Diagnosis } from '../types/diagnosis.js';

/** Must end every medicine's usage text, so farmers follow the label instead of an AI-made dose. */
export const PACKET_DOSE_NOTE = 'पैकेट पर लिखी मात्रा के अनुसार ही डालें।';

/** Adds the packet-dose note to any medicine where the AI left it out. */
export function withPacketDoseNote(diagnosis: Diagnosis): Diagnosis {
  return {
    ...diagnosis,
    dawai: diagnosis.dawai.map((dawai) =>
      dawai.kaise_use_karein.includes(PACKET_DOSE_NOTE)
        ? dawai
        : { ...dawai, kaise_use_karein: `${dawai.kaise_use_karein} ${PACKET_DOSE_NOTE}` },
    ),
  };
}
