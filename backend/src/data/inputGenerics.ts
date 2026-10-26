/**
 * ⚠️ Verify with KVK. Generic (technical) names of common farm inputs, used to match a diagnosis's medicines
 * to input dealers' products ("ज़रूरी सामान"). Only generic names: a dealer picks one of these when listing,
 * so matching never depends on a brand. Spellings are what the AI or a dealer may write (Hindi + English).
 * Ids are mirrored in frontend/src/data/inputGenerics.ts (names for the dealer's picker); keep them in sync.
 */
export const INPUT_KINDS = ['fungicide', 'insecticide', 'fertilizer', 'bio'] as const;
export type InputKind = (typeof INPUT_KINDS)[number];

export interface InputGeneric {
  kind: InputKind;
  hi: string;
  en: string;
  spellings: readonly string[];
}

export const INPUT_GENERICS = {
  mancozeb: { kind: 'fungicide', hi: 'मैंकोजेब', en: 'Mancozeb', spellings: ['mancozeb', 'मैंकोजेब', 'मेंकोजेब', 'मैन्कोजेब', 'मैंकोज़ेब'] },
  carbendazim: { kind: 'fungicide', hi: 'कार्बेन्डाजिम', en: 'Carbendazim', spellings: ['carbendazim', 'कार्बेन्डाजिम', 'कार्बेंडाजिम', 'कार्बेन्डाज़िम'] },
  copper_oxychloride: {
    kind: 'fungicide',
    hi: 'कॉपर ऑक्सीक्लोराइड',
    en: 'Copper oxychloride',
    spellings: ['copper oxychloride', 'कॉपर ऑक्सीक्लोराइड', 'कॉपर आक्सीक्लोराइड', 'कॉपर ऑक्सी क्लोराइड'],
  },
  wettable_sulphur: { kind: 'fungicide', hi: 'घुलनशील गंधक', en: 'Wettable sulphur', spellings: ['wettable sulphur', 'sulphur', 'sulfur', 'गंधक', 'सल्फर'] },
  metalaxyl: { kind: 'fungicide', hi: 'मेटालैक्सिल', en: 'Metalaxyl', spellings: ['metalaxyl', 'मेटालैक्सिल', 'मेटालेक्सिल'] },
  propiconazole: { kind: 'fungicide', hi: 'प्रोपिकोनाजोल', en: 'Propiconazole', spellings: ['propiconazole', 'प्रोपिकोनाजोल', 'प्रोपीकोनाज़ोल'] },
  hexaconazole: { kind: 'fungicide', hi: 'हेक्साकोनाजोल', en: 'Hexaconazole', spellings: ['hexaconazole', 'हेक्साकोनाजोल', 'हेक्साकोनाज़ोल'] },
  imidacloprid: { kind: 'insecticide', hi: 'इमिडाक्लोप्रिड', en: 'Imidacloprid', spellings: ['imidacloprid', 'इमिडाक्लोप्रिड', 'इमिडाक्लोरोप्रिड'] },
  thiamethoxam: { kind: 'insecticide', hi: 'थायमेथोक्साम', en: 'Thiamethoxam', spellings: ['thiamethoxam', 'थायमेथोक्साम', 'थियामेथोक्सम', 'थायामेथोक्सम'] },
  acetamiprid: { kind: 'insecticide', hi: 'एसिटामिप्रिड', en: 'Acetamiprid', spellings: ['acetamiprid', 'एसिटामिप्रिड', 'एसीटामिप्रिड'] },
  emamectin_benzoate: { kind: 'insecticide', hi: 'इमामेक्टिन बेंजोएट', en: 'Emamectin benzoate', spellings: ['emamectin', 'इमामेक्टिन', 'एमामेक्टिन'] },
  spinosad: { kind: 'insecticide', hi: 'स्पिनोसैड', en: 'Spinosad', spellings: ['spinosad', 'स्पिनोसैड', 'स्पिनोसेड'] },
  quinalphos: { kind: 'insecticide', hi: 'क्विनालफॉस', en: 'Quinalphos', spellings: ['quinalphos', 'क्विनालफॉस', 'क्विनालफास'] },
  neem_oil: { kind: 'bio', hi: 'नीम का तेल', en: 'Neem oil (azadirachtin)', spellings: ['neem oil', 'azadirachtin', 'नीम का तेल', 'नीम तेल', 'एजाडिरेक्टिन', 'नीम आधारित'] },
  trichoderma: { kind: 'bio', hi: 'ट्राइकोडर्मा', en: 'Trichoderma', spellings: ['trichoderma', 'ट्राइकोडर्मा', 'ट्राईकोडर्मा'] },
  urea: { kind: 'fertilizer', hi: 'यूरिया', en: 'Urea', spellings: ['urea', 'यूरिया'] },
  dap: { kind: 'fertilizer', hi: 'डीएपी', en: 'DAP', spellings: ['dap', 'डीएपी', 'डी.ए.पी', 'डी ए पी'] },
  zinc_sulphate: { kind: 'fertilizer', hi: 'जिंक सल्फेट', en: 'Zinc sulphate', spellings: ['zinc sulphate', 'zinc sulfate', 'जिंक सल्फेट', 'जिंक'] },
  gypsum: { kind: 'fertilizer', hi: 'जिप्सम', en: 'Gypsum', spellings: ['gypsum', 'जिप्सम'] },
} as const satisfies Record<string, InputGeneric>;

export type InputGenericId = keyof typeof INPUT_GENERICS;
export const INPUT_GENERIC_IDS = Object.keys(INPUT_GENERICS) as [InputGenericId, ...InputGenericId[]];

/** Lower case, no dots/brackets/extra spaces: "डी.ए.पी (DAP)" and "dap" compare alike. */
export function normalizeInputName(text: string): string {
  return text.toLowerCase().replace(/[().,\-_/]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * The generic a medicine name from a diagnosis refers to, or null. The longest matching spelling wins, so
 * "जिंक सल्फेट" is zinc sulphate even though "सल्फर"-like short spellings exist for other generics.
 * Short ASCII spellings ("dap") must match a whole word, never part of another word.
 */
export function matchInputGeneric(name: string): InputGenericId | null {
  const text = ` ${normalizeInputName(name)} `;
  let best: { id: InputGenericId; length: number } | null = null;
  for (const id of INPUT_GENERIC_IDS) {
    for (const spelling of INPUT_GENERICS[id].spellings) {
      const needle = normalizeInputName(spelling);
      const found = /^[a-z ]+$/.test(needle) ? text.includes(` ${needle} `) : text.includes(needle);
      if (found && (!best || needle.length > best.length)) best = { id, length: needle.length };
    }
  }
  return best?.id ?? null;
}
