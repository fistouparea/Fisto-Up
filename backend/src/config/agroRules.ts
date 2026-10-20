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
  /**
   * Advice that tells the farmer to irrigate. Shown only if at least one growing crop may be
   * watered in its current stage (see IRRIGATION_INTERVAL_DAYS); crops in a no-water stage get
   * an explicit "do not irrigate" line instead, so alerts never contradict the water card.
   */
  watering?: string[];
  byCrop?: Partial<Record<CropId, string>>;
  byStage?: Partial<Record<StageId, string>>;
}

/** Added when some crops must not be watered now. {crops} = crop names. */
export const NO_WATER_EXCEPTION = '{crops} में अभी सिंचाई न करें।';

export const ALERT_TEXTS: Record<AlertType, AlertTexts> = {
  heatwave: {
    title: 'लू / बहुत गर्मी',
    detail: '{value}°C तक गर्मी',
    general: ['दोपहर में खेत में काम न करें, पानी पीते रहें।', 'पशुओं को छाया और भरपूर पानी दें।'],
    watering: ['शाम को या सुबह जल्दी हल्की सिंचाई करें, दोपहर में नहीं।'],
    byStage: {
      germination: 'छोटे पौधे झुलस सकते हैं।',
      flowering: 'फूल के समय गर्मी से फूल झड़ सकते हैं।',
    },
  },
  frost: {
    title: 'पाला / बहुत ठंड',
    detail: 'रात में {value}°C तक ठंड',
    general: ['रात में खेत की मेड़ पर धुआँ करें (सूखी घास या कचरा जलाकर)।'],
    watering: ['शाम को खेत में हल्की सिंचाई करें, इससे पाले का असर कम होता है।'],
    byCrop: {
      sarson: 'सरसों में फूल और फली के समय पाला बहुत नुकसान करता है।',
      chana: 'चने के फूल पाले से झड़ सकते हैं।',
      jeera: 'जीरे को पाले से बहुत खतरा है, रात में धुआँ ज़रूर करें।',
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
    general: ['निराई-गुड़ाई करें, इससे मिट्टी की नमी बचती है।', 'पौधों के बीच सूखी घास या भूसा (पलवार) बिछाएँ।'],
    watering: ['सिंचाई का साधन हो तो हल्की सिंचाई करें।'],
  },
};

// ---------------------------------------------------------------------------
// Water guidance (sandy soil of Churu is the default)
// ---------------------------------------------------------------------------

export const WATER_RULES = {
  /** Don't water if at least this much rain is likely in the next days. */
  rainExpected: { nextDays: 2, minRainMm: 10, minChancePercent: 60 },
  /** Don't water if it rained at least this much in the last days. */
  recentRain: { pastDays: 3, minRainMm: 15 },
  /**
   * Intervals below are for an average evapotranspiration (et0) of this many mm/day.
   * Hotter, drier days (higher et0) shorten the interval proportionally.
   */
  referenceEt0MmPerDay: 5,
  /** Safety limits for the adjusted interval. */
  minIntervalDays: 3,
  maxIntervalDays: 30,
  /** On very hot days, water one day earlier. */
  hotDay: { tempMaxC: 40, shortenByDays: 1 },
  /** "N दिन बाद दें" is shown when watering is due within this many days. */
  dueSoonDays: 2,
} as const;

/**
 * Days between irrigations on sandy soil, per crop and stage.
 * null = do not irrigate in this stage (reason in WATER_TEXTS.noWaterStage).
 * ⚠️ VERIFY WITH KVK — typical values; depend on variety, soil and water quality.
 */
export const IRRIGATION_INTERVAL_DAYS: Record<CropId, Partial<Record<StageId, number | null>>> = {
  bajra: { germination: 12, vegetative: 15, flowering: 10, grainFilling: 12 },
  guar: { germination: 12, vegetative: 15, flowering: 12, grainFilling: 15 },
  moong: { germination: 12, vegetative: 15, flowering: 10, grainFilling: 12 },
  moth: { germination: 12, vegetative: 15, flowering: 12, grainFilling: 15 },
  // Chana needs little water; watering at full bloom makes flowers drop.
  chana: { germination: null, vegetative: 25, flowering: null, grainFilling: 25 },
  sarson: { germination: null, vegetative: 25, flowering: 20, grainFilling: 25 },
  // Jeera: light irrigations; too much water spreads disease.
  jeera: { germination: 8, vegetative: 15, flowering: 20, grainFilling: 20 },
  gehun: { germination: 12, vegetative: 10, flowering: 8, grainFilling: 10 },
  other: { germination: 12, vegetative: 12, flowering: 10, grainFilling: 12 },
};

export const WATER_TEXTS = {
  rainExpected: 'आज या कल बारिश की संभावना है।',
  recentRain: 'हाल ही में अच्छी बारिश हुई है।',
  harvest: 'कटाई का समय है, पानी न दें।',
  sowing: 'अभी बुवाई हुई है, मिट्टी में हल्की नमी बनाए रखें।',
  noWaterStage: {
    germination: 'अभी पौधे छोटे हैं, बुवाई की नमी काफी है।',
    flowering: 'फूल के समय पानी देने से फूल झड़ सकते हैं।',
  } as Partial<Record<StageId, string>>,
  notNeeded: 'इस समय पानी की ज़रूरत नहीं है।',
  rainfed: 'बारिश पर निर्भर खेत: नमी बचाने के लिए गुड़ाई करें और पलवार बिछाएँ।',
  unknownLastWatering: 'मिट्टी 2-3 इंच नीचे सूखी हो तो पानी दें। पानी देने के बाद "आज पानी दिया" दबाएँ।',
  noWeather: 'मौसम की जानकारी नहीं मिली। मिट्टी देखकर पानी दें।',
  wateredToday: 'आज पानी दे दिया है।',
  /** {days} = days since the last irrigation */
  due: 'पिछली सिंचाई को {days} दिन हो गए।',
  dueHot: 'पिछली सिंचाई को {days} दिन हो गए और गर्मी ज़्यादा है।',
  /** {days} = days until the next irrigation */
  dueSoon: '{days} दिन बाद पानी दें।',
  /** {days} = days since the last irrigation */
  notDue: '{days} दिन पहले पानी दिया था।',
};

export type WaterTipId = 'evening' | 'mulch' | 'drip' | 'sprinkler' | 'light';

/** Water-saving tips shown under the water cards. */
export const WATER_TIPS: { id: WaterTipId; text: string }[] = [
  { id: 'evening', text: 'सिंचाई शाम को या सुबह जल्दी करें। दोपहर में पानी भाप बनकर उड़ जाता है।' },
  { id: 'mulch', text: 'पौधों के बीच सूखी घास या भूसा (पलवार) बिछाएँ, मिट्टी की नमी बनी रहती है।' },
  { id: 'drip', text: 'ड्रिप (टपक) सिंचाई से पानी सीधे जड़ में जाता है और बहुत पानी बचता है।' },
  { id: 'sprinkler', text: 'फव्वारा (स्प्रिंकलर) सिंचाई रेतीली मिट्टी में पानी बचाती है।' },
  { id: 'light', text: 'रेतीली मिट्टी में एक बार में बहुत पानी न दें, हल्की सिंचाई ज़्यादा बार करें।' },
];
