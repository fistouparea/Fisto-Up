import type { FarmProfileRepository } from '../../src/services/farm/farmProfileRepository.js';
import type { FarmProfile, StoredFarmProfile } from '../../src/types/farm.js';

/** Test double for FarmProfileRepository. */
export class InMemoryFarmProfileRepository implements FarmProfileRepository {
  readonly profiles = new Map<string, StoredFarmProfile>();

  async get(deviceId: string): Promise<StoredFarmProfile | null> {
    return this.profiles.get(deviceId) ?? null;
  }

  async save(deviceId: string, profile: FarmProfile): Promise<StoredFarmProfile> {
    const stored = { ...profile, updatedAt: new Date() };
    this.profiles.set(deviceId, stored);
    return stored;
  }

  async listWithLocation(): Promise<(StoredFarmProfile & { deviceId: string })[]> {
    return [...this.profiles.entries()]
      .filter(([, profile]) => profile.location)
      .map(([deviceId, profile]) => ({ ...profile, deviceId }));
  }
}
