import type { PushSubscriptionData, StoredPushSubscription } from '../../types/push.js';

/** Implementations throw AppError('STORAGE_UNAVAILABLE') when storage is unreachable. */
export interface PushSubscriptionRepository {
  /** Creates or updates (same endpoint) a subscription. */
  save(deviceId: string, subscription: PushSubscriptionData): Promise<void>;
  listAll(): Promise<StoredPushSubscription[]>;
  /** Remembers pushed notification ids, keeping only the newest `keep`. */
  markSent(endpoint: string, ids: string[], keep: number): Promise<void>;
  remove(endpoint: string): Promise<void>;
}
