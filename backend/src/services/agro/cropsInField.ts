import type { StoredFarmProfile } from '../../types/farm.js';
import { getCropStage } from './cropStage.js';
import type { CropInField } from './weatherAlerts.js';

/** The profile's crops with their stage today. */
export function cropsInField(profile: StoredFarmProfile, today: string): CropInField[] {
  return profile.crops.map(({ crop, sowingDate }) => ({ crop, stage: getCropStage(crop, sowingDate, today).stage }));
}
