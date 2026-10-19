import type { CropId } from '../types/diagnosis.js';

/**
 * Crop stages and tasks for Churu / arid Rajasthan.
 * ⚠️ VERIFY WITH KVK: durations and tasks are typical values for local varieties and sowing times.
 * An expert can edit this file without touching any logic.
 *
 * `starts`: the day (counted from sowing) on which each stage begins.
 * `totalDays`: after this many days the crop is considered harvested.
 */
export const STAGES = ['sowing', 'germination', 'vegetative', 'flowering', 'grainFilling', 'harvest'] as const;
export type StageId = (typeof STAGES)[number];

export const STAGE_NAMES: Record<StageId, string> = {
  sowing: 'बुवाई',
  germination: 'अंकुरण',
  vegetative: 'बढ़वार',
  flowering: 'फूल',
  grainFilling: 'दाना / फली',
  harvest: 'कटाई',
};

export interface CropCalendar {
  starts: Record<StageId, number>;
  totalDays: number;
  /** Extra tasks for this crop, added to the general tasks of the stage. */
  tasks: Partial<Record<StageId, string[]>>;
}

/** Tasks that apply to every crop in a stage. */
export const GENERAL_TASKS: Record<StageId, string[]> = {
  sowing: ['बीज को उपचार करके ही बोएँ।'],
  germination: ['देखें कि बीज ठीक से उगे हैं, खाली जगह हो तो दोबारा बोएँ।'],
  vegetative: ['निराई-गुड़ाई करके खरपतवार निकालें।', 'पत्तों पर कीड़े या धब्बे देखें, दिखें तो फोटो से जाँच करें।'],
  flowering: ['फूल के समय पानी की कमी न होने दें।', 'छिड़काव सिर्फ सुबह या शाम को करें, ताकि मधुमक्खियाँ बचें।'],
  grainFilling: ['पक्षियों और चूहों से फसल बचाएँ।', 'दाने/फली में कीड़े देखें, दिखें तो फोटो से जाँच करें।'],
  harvest: ['फसल पकने पर समय से कटाई करें।', 'कटी फसल को सूखी और ऊँची जगह पर रखें।'],
};

export const CROP_CALENDARS: Record<CropId, CropCalendar> = {
  bajra: {
    starts: { sowing: 0, germination: 2, vegetative: 8, flowering: 41, grainFilling: 56, harvest: 81 },
    totalDays: 95,
    tasks: {
      vegetative: ['बुवाई के 15-20 दिन बाद घने पौधे निकालकर दूरी बनाएँ।'],
      flowering: ['जोगिया (हरी बाली) रोग वाले पौधे उखाड़कर नष्ट करें।'],
    },
  },
  guar: {
    starts: { sowing: 0, germination: 2, vegetative: 9, flowering: 41, grainFilling: 61, harvest: 96 },
    totalDays: 115,
    tasks: { vegetative: ['पत्तों पर झुलसा रोग के धब्बे देखें।'] },
  },
  moong: {
    starts: { sowing: 0, germination: 2, vegetative: 7, flowering: 31, grainFilling: 46, harvest: 66 },
    totalDays: 75,
    tasks: { vegetative: ['पीले मोज़ेक रोग वाले पौधे उखाड़ें, सफ़ेद मक्खी पर नज़र रखें।'] },
  },
  moth: {
    starts: { sowing: 0, germination: 2, vegetative: 8, flowering: 36, grainFilling: 51, harvest: 81 },
    totalDays: 90,
    tasks: { vegetative: ['पीले मोज़ेक रोग वाले पौधे उखाड़ें, सफ़ेद मक्खी पर नज़र रखें।'] },
  },
  chana: {
    starts: { sowing: 0, germination: 3, vegetative: 11, flowering: 51, grainFilling: 76, harvest: 116 },
    totalDays: 135,
    tasks: {
      vegetative: ['बुवाई के 30-35 दिन बाद ऊपर की कोंपलें तोड़ें (खुटाई), इससे शाखाएँ बढ़ती हैं।'],
      grainFilling: ['फली छेदक सूंडी देखें। खेत में पक्षियों के बैठने के लिए "T" आकार की खूँटियाँ लगाएँ।'],
    },
  },
  sarson: {
    starts: { sowing: 0, germination: 3, vegetative: 9, flowering: 46, grainFilling: 76, harvest: 121 },
    totalDays: 140,
    tasks: {
      vegetative: ['बुवाई के 15-20 दिन बाद घने पौधे निकालकर दूरी बनाएँ।'],
      flowering: ['माहू (चेपा) कीड़ा देखें, पत्तों या फूलों पर दिखे तो फोटो से जाँच करें।'],
    },
  },
  jeera: {
    starts: { sowing: 0, germination: 7, vegetative: 16, flowering: 51, grainFilling: 76, harvest: 111 },
    totalDays: 125,
    tasks: {
      flowering: ['बादल और नमी हो तो झुलसा व छाछ्या रोग पर नज़र रखें।', 'ज़्यादा पानी न दें, जीरे में रोग बढ़ते हैं।'],
    },
  },
  gehun: {
    starts: { sowing: 0, germination: 3, vegetative: 9, flowering: 61, grainFilling: 86, harvest: 121 },
    totalDays: 140,
    tasks: {
      vegetative: [
        'पहली सिंचाई बुवाई के 20-25 दिन बाद (जड़ें बनते समय) ज़रूर करें।',
        'यूरिया की दूसरी खुराक पहली सिंचाई के साथ दें, मात्रा कृषि विभाग से पूछें।',
      ],
    },
  },
  other: {
    starts: { sowing: 0, germination: 3, vegetative: 10, flowering: 45, grainFilling: 65, harvest: 90 },
    totalDays: 105,
    tasks: {},
  },
};
