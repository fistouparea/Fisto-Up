/**
 * "बोलकर चलाएँ": what a farmer can ask for by voice, with example phrases. Edit here, not in code.
 * The app opens the screen of the chosen intent (ids mirrored in frontend/src/data/voiceIntents.ts).
 * Keywords are checked first (free, instant); only when none fits, the AI picks from this fixed list.
 * Keywords include common Marwari/Shekhawati forms (⚠️ review by a local speaker).
 */
export interface VoiceIntent {
  /** For the AI: what this screen is for (English, short). */
  description: string;
  /** Example phrases (Hindi / Rajasthani), also shown to the AI. */
  examples: readonly string[];
  /** Any of these words in the spoken text selects this intent without the AI. Lower case. */
  keywords: readonly string[];
}

export const VOICE_INTENTS = {
  diagnose: {
    description: 'check a sick crop with a photo',
    examples: ['फसल की जाँच करनी है', 'पत्ते पीले हो गए', 'बीमारी देखनी है', 'फोटो से जाँच'],
    keywords: ['जाँच', 'जांच', 'बीमारी', 'रोग', 'कीड़ा', 'कीड़े', 'फोटो', 'पीले', 'पीला'],
  },
  weather: {
    description: 'weather forecast, rain, heat, frost',
    examples: ['मौसम बताओ', 'बारिश होगी क्या', 'आज कितनी गर्मी है', 'मेह आसी के'],
    keywords: ['मौसम', 'बारिश', 'बरसात', 'मेह', 'मेंह', 'गर्मी', 'पाला', 'ठंड', 'आंधी', 'आँधी'],
  },
  water: {
    description: 'when to irrigate / water the crop',
    examples: ['पानी कब दूँ', 'सिंचाई करनी है क्या', 'पाणी कद देऊं'],
    keywords: ['पानी', 'पाणी', 'सिंचाई', 'सींच'],
  },
  calendar: {
    description: 'crop calendar and today\'s farm work',
    examples: ['आज क्या काम करना है', 'फसल कैलेंडर दिखाओ', 'बुवाई कब करूँ'],
    keywords: ['कैलेंडर', 'आज का काम', 'क्या काम', 'काम बताओ', 'बुवाई कब'],
  },
  sell: {
    description: 'sell own produce in the marketplace',
    examples: ['बाजरा बेचना है', 'माल बेचना है', 'मेरा अनाज बिकवाओ', 'बेचणो है'],
    keywords: ['बेचना', 'बेचनी', 'बेचणो', 'बेचणा', 'बिकवा', 'बेचूं', 'बेचूँ'],
  },
  buy: {
    description: 'buy things in the marketplace (grain, SHG products, seeds, fertilizer, medicine)',
    examples: ['खाद खरीदनी है', 'बाज़ार दिखाओ', 'बीज चाहिए', 'दवाई कठे मिलसी'],
    keywords: ['खरीद', 'बाज़ार', 'बाजार', 'खाद', 'बीज', 'दवाई', 'कठे मिल'],
  },
  history: {
    description: 'earlier crop checks (history)',
    examples: ['पुरानी जाँच दिखाओ', 'मेरी जाँच'],
    keywords: ['पुरानी', 'मेरी जाँच', 'पिछली'],
  },
  farm: {
    description: 'my farm details: location, crops, field size',
    examples: ['मेरा खेत', 'खेत की जानकारी बदलनी है', 'नई फसल जोड़नी है'],
    keywords: ['मेरा खेत', 'खेत की जानकारी', 'म्हारो खेत', 'फसल जोड़'],
  },
  notifications: {
    description: 'notifications and alerts',
    examples: ['सूचना दिखाओ', 'कोई नया संदेश'],
    keywords: ['सूचना', 'संदेश', 'नोटिफिकेशन'],
  },
  help: {
    description: 'help or complaint to the coordinator',
    examples: ['मदद चाहिए', 'शिकायत करनी है', 'संयोजक से बात'],
    keywords: ['मदद', 'शिकायत', 'संयोजक'],
  },
  settings: {
    description: 'app settings: language, read aloud',
    examples: ['भाषा बदलो', 'राजस्थानी में', 'पढ़कर सुनाओ चालू करो'],
    keywords: ['भाषा', 'सेटिंग', 'पढ़कर सुना', 'राजस्थानी', 'अंग्रेज़ी', 'english'],
  },
  schemes: {
    description: 'government schemes for farmers (PM-KISAN, crop insurance, KCC, subsidies)',
    examples: ['सरकारी योजना बताओ', 'फसल बीमा कैसे करें', 'किसान सम्मान निधि'],
    keywords: ['योजना', 'सरकारी', 'बीमा', 'सम्मान निधि', 'सब्सिडी', 'अनुदान', 'किसान क्रेडिट'],
  },
  equipment: {
    description: 'rent a farm machine (tractor, thresher, sprayer) or give own machine on rent',
    examples: ['ट्रैक्टर किराए पर चाहिए', 'थ्रेशर चाहिए', 'मशीन किराए पर देनी है'],
    keywords: ['ट्रैक्टर', 'थ्रेशर', 'मशीन', 'किराए', 'किराये', 'रोटावेटर', 'स्प्रेयर'],
  },
  labour: {
    description: 'find farm workers or find farm work (daily wage)',
    examples: ['मज़दूर चाहिए', 'कटाई के लिए आदमी चाहिए', 'मुझे काम चाहिए'],
    keywords: ['मज़दूर', 'मजदूर', 'आदमी चाहिए', 'काम चाहिए', 'दिहाड़ी', 'मजूर'],
  },
  livestock: {
    description: 'buy or sell cattle, goats, camels (animals)',
    examples: ['गाय बेचनी है', 'भैंस खरीदनी है', 'पशु देखने हैं', 'ऊँट'],
    // "गाय बेचनी है" is about animals, not about selling produce: the longer animal phrases win.
    keywords: ['गाय', 'भैंस', 'बकरी', 'भेड़', 'ऊँट', 'ऊंट', 'पशु', 'ढोर', ...['गाय', 'भैंस', 'बकरी', 'ऊँट', 'पशु'].flatMap((animal) => [`${animal} बेच`, `${animal} खरीद`])],
  },
  home: {
    description: 'home screen',
    examples: ['होम पर चलो', 'शुरू की स्क्रीन'],
    keywords: ['होम', 'शुरू'],
  },
} as const satisfies Record<string, VoiceIntent>;

export type VoiceIntentId = keyof typeof VOICE_INTENTS;
export const VOICE_INTENT_IDS = Object.keys(VOICE_INTENTS) as [VoiceIntentId, ...VoiceIntentId[]];

export const VOICE_RULES = {
  maxTextLength: 300,
} as const;
