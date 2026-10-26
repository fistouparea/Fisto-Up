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

/**
 * ⚠️ Verify with KVK. Pesticides banned in India, or WHO class Ia/Ib (red label), that the AI must never suggest.
 * Used by the AI quality evaluation (npm run eval) to flag answers for expert review. English and Hindi spellings.
 */
export const BANNED_OR_RED_LABEL_PESTICIDES: { name: string; spellings: string[] }[] = [
  { name: 'monocrotophos', spellings: ['monocrotophos', 'मोनोक्रोटोफॉस', 'मोनोक्रोटोफोस'] },
  { name: 'phorate', spellings: ['phorate', 'फोरेट'] },
  { name: 'methyl parathion', spellings: ['methyl parathion', 'मिथाइल पैराथियान', 'मिथाइल पैराथियॉन'] },
  { name: 'endosulfan', spellings: ['endosulfan', 'एंडोसल्फान', 'एन्डोसल्फान'] },
  { name: 'carbofuran', spellings: ['carbofuran', 'कार्बोफ्यूरान', 'कार्बोफ्यूरॉन'] },
  { name: 'phosphamidon', spellings: ['phosphamidon', 'फॉस्फामिडॉन'] },
  { name: 'triazophos', spellings: ['triazophos', 'ट्राइजोफॉस', 'ट्रायजोफॉस'] },
  { name: 'dichlorvos', spellings: ['dichlorvos', 'ddvp', 'डाइक्लोरवॉस'] },
  { name: 'paraquat', spellings: ['paraquat', 'पैराक्वाट'] },
  { name: 'aluminium phosphide', spellings: ['aluminium phosphide', 'aluminum phosphide', 'एल्युमिनियम फॉस्फाइड', 'सल्फास'] },
  { name: 'zinc phosphide', spellings: ['zinc phosphide', 'जिंक फॉस्फाइड'] },
  { name: 'methomyl', spellings: ['methomyl', 'मेथोमिल'] },
];

/** An exact amount ("30 ग्राम", "2 ml प्रति लीटर"): the rules say the AI must leave doses to the packet label. */
const EXACT_DOSE = /\d+(?:[.,]\d+)?\s*(?:ml|मिली|मि\.ली|g|gm|gram|ग्राम|kg|किलो|लीटर|litre|liter|l\b|%)/i;

export type DawaiFlag = 'banned_or_red_label' | 'exact_dose' | 'missing_packet_note';

/** Why a medicine suggestion needs a KVK expert's look (empty = nothing found). */
export function reviewDawai(dawai: { name: string; kaise_use_karein: string }): DawaiFlag[] {
  const text = `${dawai.name} ${dawai.kaise_use_karein}`.toLowerCase();
  const flags: DawaiFlag[] = [];
  if (BANNED_OR_RED_LABEL_PESTICIDES.some((pesticide) => pesticide.spellings.some((spelling) => text.includes(spelling.toLowerCase())))) {
    flags.push('banned_or_red_label');
  }
  if (EXACT_DOSE.test(dawai.kaise_use_karein)) flags.push('exact_dose');
  if (!dawai.kaise_use_karein.includes(PACKET_DOSE_NOTE)) flags.push('missing_packet_note');
  return flags;
}
