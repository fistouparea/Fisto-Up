import type { WaterAdvice } from '../api/types';
import { hi } from '../strings/hi';

/** "आज पानी दें", "2 दिन बाद दें", ... */
export function waterStatusLabel(advice: WaterAdvice): string {
  return advice.status === 'water_later' ? `${advice.inDays ?? ''} ${hi.water.status.water_later}` : hi.water.status[advice.status];
}
