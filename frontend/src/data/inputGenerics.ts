/** Mirrors backend/src/data/inputGenerics.ts (ids, kind, names); keep in sync. ⚠️ Verify with KVK. */
export type InputKind = 'fungicide' | 'insecticide' | 'fertilizer' | 'bio';

export const INPUT_GENERICS = {
  mancozeb: { kind: 'fungicide', hi: 'मैंकोजेब', en: 'Mancozeb' },
  carbendazim: { kind: 'fungicide', hi: 'कार्बेन्डाजिम', en: 'Carbendazim' },
  copper_oxychloride: { kind: 'fungicide', hi: 'कॉपर ऑक्सीक्लोराइड', en: 'Copper oxychloride' },
  wettable_sulphur: { kind: 'fungicide', hi: 'घुलनशील गंधक', en: 'Wettable sulphur' },
  metalaxyl: { kind: 'fungicide', hi: 'मेटालैक्सिल', en: 'Metalaxyl' },
  propiconazole: { kind: 'fungicide', hi: 'प्रोपिकोनाजोल', en: 'Propiconazole' },
  hexaconazole: { kind: 'fungicide', hi: 'हेक्साकोनाजोल', en: 'Hexaconazole' },
  imidacloprid: { kind: 'insecticide', hi: 'इमिडाक्लोप्रिड', en: 'Imidacloprid' },
  thiamethoxam: { kind: 'insecticide', hi: 'थायमेथोक्साम', en: 'Thiamethoxam' },
  acetamiprid: { kind: 'insecticide', hi: 'एसिटामिप्रिड', en: 'Acetamiprid' },
  emamectin_benzoate: { kind: 'insecticide', hi: 'इमामेक्टिन बेंजोएट', en: 'Emamectin benzoate' },
  spinosad: { kind: 'insecticide', hi: 'स्पिनोसैड', en: 'Spinosad' },
  quinalphos: { kind: 'insecticide', hi: 'क्विनालफॉस', en: 'Quinalphos' },
  neem_oil: { kind: 'bio', hi: 'नीम का तेल', en: 'Neem oil' },
  trichoderma: { kind: 'bio', hi: 'ट्राइकोडर्मा', en: 'Trichoderma' },
  urea: { kind: 'fertilizer', hi: 'यूरिया', en: 'Urea' },
  dap: { kind: 'fertilizer', hi: 'डीएपी', en: 'DAP' },
  zinc_sulphate: { kind: 'fertilizer', hi: 'जिंक सल्फेट', en: 'Zinc sulphate' },
  gypsum: { kind: 'fertilizer', hi: 'जिप्सम', en: 'Gypsum' },
} as const satisfies Record<string, { kind: InputKind; hi: string; en: string }>;

export type InputGenericId = keyof typeof INPUT_GENERICS;
export const INPUT_GENERIC_IDS = Object.keys(INPUT_GENERICS) as InputGenericId[];
