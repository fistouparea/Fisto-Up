import type { CropId } from './diagnosis.js';

export type WaterStatus =
  /** आज पानी दें */
  | 'water_today'
  /** N दिन बाद दें */
  | 'water_later'
  /** आज पानी न दें */
  | 'skip'
  /** Not enough information: check the soil */
  | 'check_soil'
  /** No irrigation source */
  | 'rainfed';

export interface WaterAdvice {
  crop: CropId;
  status: WaterStatus;
  /** For water_later: in how many days. */
  inDays?: number;
  /** One short Hindi reason. */
  reason: string;
}
