import type { StageId } from '../data/cropCalendar.js';
import type { CropId } from '../types/diagnosis.js';
import type { AlertType } from '../types/weather.js';

/**
 * ⚠️ VERIFY WITH KVK — rule thresholds and advice texts for weather alerts and water guidance.
 * Everything a farming expert may want to tune lives in this one file. The logic in
 * services/agro/* only reads these values; change numbers or texts here, not there.
 */

// ---------------------------------------------------------------------------
// Weather alerts
// ---------------------------------------------------------------------------

export const ALERT_RULES = {
  /** Alerts look at today and the next N days. */
  lookaheadDays: 3,
  heatwave: { warningTempMaxC: 42, dangerTempMaxC: 45 },
  /** Frost risk is judged from the night minimum. */
  frost: { warningTempMinC: 4, dangerTempMinC: 2 },
  /** Daily rain. IMD calls 64.5 mm "heavy"; sandy soils here flood and erode earlier. */
  heavyRain: { warningRainMm: 50, dangerRainMm: 100 },
  /** Gusts (km/h): dust storm (aandhi) risk. */
  strongWind: { warningGustKmh: 50, dangerGustKmh: 70 },
  /** No meaningful rain in the last 7 days AND the next 7 days, while a crop is in the field. */
  drySpell: { maxTotalRainMm: 2 },
} as const;

interface AlertTexts {
  title: string;
  /** {value} is replaced with the number that triggered the alert. */
  detail: string;
  general: string[];
  byCrop?: Partial<Record<CropId, string>>;
  byStage?: Partial<Record<StageId, string>>;
}

export const ALERT_TEXTS: Record<AlertType, AlertTexts> = {
  heatwave: {
    title: 'लू / बहुत गर्मी',
    detail: '{value}°C तक गर्मी',
    general: [
      'सिंचाई सुबह जल्दी या शाम को करें, दोपहर में नहीं।',
      'दोपहर में खेत में काम न करें, पानी पीते रहें।',
      'पशुओं को छाया और भरपूर पानी दें।',
    ],
    byStage: {
      germination: 'छोटे पौधे झुलस सकते हैं, हल्की सिंचाई करें।',
      flowering: 'फूल के समय गर्मी से फूल झड़ते हैं, शाम को हल्की सिंचाई करें।',
    },
  },
  frost: {
    title: 'पाला / बहुत ठंड',
    detail: 'रात में {value}°C तक ठंड',
    general: [
      'शाम को खेत में हल्की सिंचाई करें, इससे पाले का असर कम होता है।',
      'रात में खेत की मेड़ पर धुआँ करें (सूखी घास या कचरा जलाकर)।',
    ],
    byCrop: {
      sarson: 'सरसों में फूल और फली के समय पाला बहुत नुकसान करता है।',
      chana: 'चने के फूल पाले से झड़ सकते हैं।',
      jeera: 'जीरे को पाले से बहुत खतरा है, रात में सिंचाई और धुआँ ज़रूर करें।',
    },
  },
  heavyRain: {
    title: 'भारी बारिश',
    detail: '{value} मिमी तक बारिश',
    general: [
      'खेत से पानी निकलने के लिए नाली बनाएँ।',
      'बारिश से पहले दवाई या खाद न डालें, बह जाएगी।',
      'सिंचाई न करें।',
    ],
    byStage: { harvest: 'कटाई पास है: फसल जल्दी काटकर ढककर ऊँची जगह रखें।' },
  },
  strongWind: {
    title: 'तेज़ हवा / आँधी',
    detail: '{value} किमी/घंटा तक हवा',
    general: [
      'छिड़काव न करें, दवाई उड़ जाएगी।',
      'सिंचाई रोक दें, गीली मिट्टी में पौधे गिर सकते हैं।',
      'कटी फसल और भूसे को बाँधकर या ढककर रखें।',
    ],
    byCrop: {
      gehun: 'ऊँचा गेहूं गिर सकता है।',
      bajra: 'ऊँचा बाजरा गिर सकता है।',
    },
  },
  drySpell: {
    title: 'लंबा सूखा',
    detail: 'पिछले 7 और अगले 7 दिन में बारिश नहीं',
    general: [
      'निराई-गुड़ाई करें, इससे मिट्टी की नमी बचती है।',
      'पौधों के बीच सूखी घास या भूसा (पलवार) बिछाएँ।',
      'सिंचाई का साधन हो तो हल्की सिंचाई करें।',
    ],
  },
};
