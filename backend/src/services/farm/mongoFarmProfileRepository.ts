import { AppError } from '../../errors/AppError.js';
import { FarmProfileModel } from '../../models/FarmProfile.js';
import { farmProfileSchema, type FarmProfile, type StoredFarmProfile } from '../../types/farm.js';
import type { FarmProfileRepository } from './farmProfileRepository.js';

export class MongoFarmProfileRepository implements FarmProfileRepository {
  async get(deviceId: string): Promise<StoredFarmProfile | null> {
    const row = await withStorageErrors(() => FarmProfileModel.findOne({ deviceId }).lean().exec());
    return row ? toStored(row) : null;
  }

  async save(deviceId: string, profile: FarmProfile): Promise<StoredFarmProfile> {
    const row = await withStorageErrors(() =>
      FarmProfileModel.findOneAndReplace({ deviceId }, { deviceId, ...profile }, { upsert: true, returnDocument: 'after' })
        .lean()
        .exec(),
    );
    if (!row) throw new AppError('STORAGE_UNAVAILABLE', 'Profile was not saved');
    return toStored(row);
  }

  async listWithLocation(): Promise<(StoredFarmProfile & { deviceId: string })[]> {
    const rows = await withStorageErrors(() => FarmProfileModel.find({ location: { $exists: true } }).lean().exec());
    return rows.map((row) => ({ ...toStored(row), deviceId: row.deviceId }));
  }
}

/** Re-validates stored data with the same schema as the API, so a bad row never reaches the rules. */
function toStored(row: { updatedAt?: Date } & Record<string, unknown>): StoredFarmProfile {
  const profile = farmProfileSchema.parse({
    location: row.location ?? undefined,
    crops: row.crops,
    fieldSizeBigha: row.fieldSizeBigha ?? undefined,
    irrigation: row.irrigation ?? undefined,
  });
  return { ...profile, updatedAt: row.updatedAt ?? new Date(0) };
}

async function withStorageErrors<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw new AppError('STORAGE_UNAVAILABLE', 'MongoDB operation failed', { cause: error });
  }
}
