import type { FarmProfile, StoredFarmProfile } from '../../types/farm.js';

/**
 * Farm profiles keyed by the anonymous device id.
 * Implementations throw AppError('STORAGE_UNAVAILABLE') when storage is unreachable.
 */
export interface FarmProfileRepository {
  get(deviceId: string): Promise<StoredFarmProfile | null>;
  /** Creates or replaces the profile. */
  save(deviceId: string, profile: FarmProfile): Promise<StoredFarmProfile>;
  /** All profiles that have a location (for scheduled alerts). */
  listWithLocation(): Promise<(StoredFarmProfile & { deviceId: string })[]>;
}
