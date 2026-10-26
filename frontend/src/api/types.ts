/** Mirrors backend/src/types/diagnosis.ts. Keep the two in sync. */
export const CROP_IDS = ['bajra', 'guar', 'moong', 'moth', 'chana', 'sarson', 'jeera', 'gehun', 'other'] as const;
export type CropId = (typeof CROP_IDS)[number];

export interface Dawai {
  name: string;
  kaise_use_karein: string;
}

/** healthy = green, mild = yellow (ध्यान दें), serious = red (गंभीर). Older saved results may not have it. */
export type Severity = 'healthy' | 'mild' | 'serious';

export interface Diagnosis {
  problem_name: string;
  explanation: string;
  desi_upay: string[];
  dawai: Dawai[];
  savdhani: string[];
  severity?: Severity;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

/** `historyId`: the saved "मेरी जाँच" record (feedback is linked to it). Missing when it was not saved. */
export type DiagnoseResponse = { status: 'ok'; diagnosis: Diagnosis; historyId?: string } | { status: 'unclear' };

/** One row of the "मेरी जाँच" list. Dates are ISO strings. */
export interface HistorySummary {
  id: string;
  crop: CropId;
  problemName: string;
  severity?: Severity;
  createdAt: string;
}

export interface HistoryPage {
  items: HistorySummary[];
  page: number;
  hasMore: boolean;
}

export interface HistoryRecord {
  id: string;
  crop: CropId;
  diagnosis: Diagnosis;
  createdAt: string;
}

export const IRRIGATION_SOURCES = ['tubewell', 'canal', 'rainfed', 'tanka'] as const;
export type IrrigationSource = (typeof IRRIGATION_SOURCES)[number];

/** Dates are "YYYY-MM-DD" in India time. */
export interface FarmCrop {
  crop: CropId;
  sowingDate: string;
  lastWateredOn?: string;
}

export interface FarmLocation {
  lat: number;
  lon: number;
  source: 'gps' | 'list';
  district?: string;
  tehsil?: string;
}

/** "मेरा खेत". Every part is optional because each onboarding screen can be skipped. */
export interface FarmProfile {
  location?: FarmLocation;
  crops: FarmCrop[];
  fieldSizeBigha?: number;
  irrigation?: IrrigationSource;
}

export interface DayWeather {
  date: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  rainMm: number;
  rainChance: number;
  windMax: number;
  gustMax: number;
  et0: number | null;
}

export interface Forecast {
  fetchedAt: string;
  current: { temperature: number; weatherCode: number; windSpeed: number } | null;
  /** Today first. */
  days: DayWeather[];
  past: { date: string; rainMm: number }[];
}

export type AlertType = 'heatwave' | 'frost' | 'heavyRain' | 'strongWind' | 'drySpell';

export interface WeatherAlert {
  type: AlertType;
  severity: 'warning' | 'danger';
  date: string;
  title: string;
  detail: string;
  advice: string[];
}

export interface WeatherResponse {
  forecast: Forecast | null;
  alerts: WeatherAlert[];
}

export type WaterStatus = 'water_today' | 'water_later' | 'skip' | 'check_soil' | 'rainfed';
export type WaterTipId = 'evening' | 'mulch' | 'drip' | 'sprinkler' | 'light';

export interface WaterAdvice {
  crop: CropId;
  status: WaterStatus;
  inDays?: number;
  reason: string;
}

export interface WaterGuidance {
  advice: WaterAdvice[];
  tips: { id: WaterTipId; text: string }[];
}

export type StageId = 'sowing' | 'germination' | 'vegetative' | 'flowering' | 'grainFilling' | 'harvest';

export interface CropStageInfo {
  crop: CropId;
  sowingDate: string;
  daysSinceSowing: number;
  /** null once the crop is harvested. */
  stage: StageId | null;
  stageName: string | null;
  timeline: { stage: StageId; name: string; startDay: number; current: boolean; done: boolean }[];
  tasks: string[];
}

export type NotificationType = 'alert' | 'task' | 'followup';

export interface AppNotification {
  id: string;
  type: NotificationType;
  severity: 'info' | 'warning' | 'danger';
  title: string;
  body: string;
  href: string;
  date: string;
  crop?: CropId;
  diagnosisId?: string;
}

export type FollowUpAnswer = 'better' | 'same' | 'worse';

export interface DashboardTask {
  crop: CropId;
  stageName: string | null;
  task: string;
}

/** Everything the home screen needs, in one response. */
export interface Dashboard {
  generatedAt: string;
  hasProfile: boolean;
  forecast: Forecast | null;
  alerts: WeatherAlert[];
  tasks: DashboardTask[];
  water: WaterAdvice[];
  followUps: AppNotification[];
}

export interface MandiPrice {
  crop: CropId;
  market: string;
  /** ₹ per quintal */
  modalPrice: number;
  minPrice: number;
  maxPrice: number;
  date: string;
}

export interface MandiResponse {
  available: boolean;
  prices: MandiPrice[];
}

/** Error codes sent by the backend, plus the ones the app itself can produce. */
export const ERROR_CODES = [
  'INVALID_INPUT',
  'INVALID_IMAGE',
  'FILE_TOO_LARGE',
  'RATE_LIMITED',
  'AI_TIMEOUT',
  'AI_ERROR',
  'NOT_FOUND',
  'HISTORY_UNAVAILABLE',
  'STORAGE_UNAVAILABLE',
  'WEATHER_UNAVAILABLE',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'INVALID_LOGIN',
  'LOGIN_LOCKED',
  'PHONE_TAKEN',
  'WEAK_PIN',
  'SELLER_PROFILE_MISSING',
  'OUT_OF_STOCK',
  'INVALID_TRANSITION',
  'CONFLICT',
  'NEEDS_REPLICA_SET',
  'ACTIVE_ORDERS',
  'INVITE_REQUIRED',
  'INVALID_INVITE',
  'LICENCE_CHECK_REQUIRED',
  'BLOCKED_INPUT',
  'LICENCE_NOT_VERIFIED',
  'INTERNAL',
  'NETWORK',
  'PHOTO_READ_FAILED',
  'UNKNOWN',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];
