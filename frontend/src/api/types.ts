/** Mirrors backend/src/types/diagnosis.ts. Keep the two in sync. */
export const CROP_IDS = ['bajra', 'guar', 'moong', 'moth', 'chana', 'sarson', 'jeera', 'gehun', 'other'] as const;
export type CropId = (typeof CROP_IDS)[number];

export interface Dawai {
  name: string;
  kaise_use_karein: string;
}

export interface Diagnosis {
  problem_name: string;
  explanation: string;
  desi_upay: string[];
  dawai: Dawai[];
  savdhani: string[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

export type DiagnoseResponse = { status: 'ok'; diagnosis: Diagnosis } | { status: 'unclear' };

/** One row of the "मेरी जाँच" list. Dates are ISO strings. */
export interface HistorySummary {
  id: string;
  crop: CropId;
  problemName: string;
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
  'INTERNAL',
  'NETWORK',
  'PHOTO_READ_FAILED',
  'UNKNOWN',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];
