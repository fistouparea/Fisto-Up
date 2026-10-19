import { AppError } from '../../errors/AppError.js';
import type { CropId } from '../../types/diagnosis.js';
import type { FarmProfile, StoredFarmProfile } from '../../types/farm.js';
import { todayInIndia } from '../../utils/dates.js';
import type { FarmProfileRepository } from './farmProfileRepository.js';

/** GPS is stored rounded to ~1 km: enough for weather, without pinpointing the farmer's house. */
const LOCATION_DECIMALS = 2;

export async function saveFarmProfile(
  repository: FarmProfileRepository,
  deviceId: string,
  profile: FarmProfile,
): Promise<StoredFarmProfile> {
  return repository.save(deviceId, withRoundedLocation(profile));
}

/** Records "आज पानी दिया" for one crop of the profile. */
export async function markCropWatered(
  repository: FarmProfileRepository,
  deviceId: string,
  crop: CropId,
  today: string = todayInIndia(),
): Promise<StoredFarmProfile> {
  const profile = await repository.get(deviceId);
  if (!profile?.crops.some((entry) => entry.crop === crop)) {
    throw new AppError('NOT_FOUND', 'Crop is not in the farm profile');
  }

  const { updatedAt: _updatedAt, ...current } = profile;
  return repository.save(deviceId, {
    ...current,
    crops: current.crops.map((entry) => (entry.crop === crop ? { ...entry, lastWateredOn: today } : entry)),
  });
}

function withRoundedLocation(profile: FarmProfile): FarmProfile {
  if (!profile.location) return profile;
  const factor = 10 ** LOCATION_DECIMALS;
  const round = (value: number) => Math.round(value * factor) / factor;
  return { ...profile, location: { ...profile.location, lat: round(profile.location.lat), lon: round(profile.location.lon) } };
}
