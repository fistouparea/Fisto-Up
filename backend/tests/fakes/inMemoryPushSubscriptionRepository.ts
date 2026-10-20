import type { PushSubscriptionRepository } from '../../src/services/push/pushSubscriptionRepository.js';
import type { PushSubscriptionData, StoredPushSubscription } from '../../src/types/push.js';

export class InMemoryPushSubscriptionRepository implements PushSubscriptionRepository {
  readonly items = new Map<string, StoredPushSubscription>();

  async save(deviceId: string, subscription: PushSubscriptionData): Promise<void> {
    const existing = this.items.get(subscription.endpoint);
    this.items.set(subscription.endpoint, { deviceId, subscription, sentIds: existing?.sentIds ?? [] });
  }

  async listAll(): Promise<StoredPushSubscription[]> {
    return [...this.items.values()].map((item) => ({ ...item, sentIds: [...item.sentIds] }));
  }

  async markSent(endpoint: string, ids: string[], keep: number): Promise<void> {
    const item = this.items.get(endpoint);
    if (item) item.sentIds = [...item.sentIds, ...ids].slice(-keep);
  }

  async remove(endpoint: string): Promise<void> {
    this.items.delete(endpoint);
  }
}
