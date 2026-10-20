import { AppError } from '../../errors/AppError.js';
import { PushSubscriptionModel } from '../../models/PushSubscription.js';
import type { PushSubscriptionData, StoredPushSubscription } from '../../types/push.js';
import type { PushSubscriptionRepository } from './pushSubscriptionRepository.js';

export class MongoPushSubscriptionRepository implements PushSubscriptionRepository {
  async save(deviceId: string, subscription: PushSubscriptionData): Promise<void> {
    await withStorageErrors(() =>
      PushSubscriptionModel.updateOne(
        { endpoint: subscription.endpoint },
        { $set: { deviceId, keys: subscription.keys }, $setOnInsert: { sentIds: [] } },
        { upsert: true },
      ).exec(),
    );
  }

  async listAll(): Promise<StoredPushSubscription[]> {
    const rows = await withStorageErrors(() => PushSubscriptionModel.find().lean().exec());
    return rows.map((row) => ({
      deviceId: row.deviceId,
      subscription: { endpoint: row.endpoint, keys: { p256dh: row.keys.p256dh, auth: row.keys.auth } },
      sentIds: row.sentIds,
    }));
  }

  async markSent(endpoint: string, ids: string[], keep: number): Promise<void> {
    await withStorageErrors(() =>
      PushSubscriptionModel.updateOne({ endpoint }, { $push: { sentIds: { $each: ids, $slice: -keep } } }).exec(),
    );
  }

  async remove(endpoint: string): Promise<void> {
    await withStorageErrors(() => PushSubscriptionModel.deleteOne({ endpoint }).exec());
  }
}

async function withStorageErrors<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw new AppError('STORAGE_UNAVAILABLE', 'MongoDB operation failed', { cause: error });
  }
}
