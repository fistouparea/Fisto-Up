import { PUSH_RULES } from '../config/notificationRules.js';
import { buildFarmSnapshot, type FarmSnapshotDeps } from '../services/farm/farmSnapshot.js';
import type { PushSender } from '../services/push/pushSender.js';
import type { PushSubscriptionRepository } from '../services/push/pushSubscriptionRepository.js';
import type { AppNotification } from '../types/notifications.js';
import type { StoredPushSubscription } from '../types/push.js';

export interface NotificationJobDeps extends FarmSnapshotDeps {
  subscriptions: PushSubscriptionRepository;
  sender: PushSender;
}

export interface JobResult {
  sent: number;
  removed: number;
  failed: number;
}

/**
 * For every push subscription: build the farm's notifications, push the new ones
 * (at most PUSH_RULES.maxPerRun, most urgent first) and remember all of them as sent.
 * One failing device never stops the others.
 */
export async function runNotificationJob(deps: NotificationJobDeps, now: Date = new Date()): Promise<JobResult> {
  const result: JobResult = { sent: 0, removed: 0, failed: 0 };
  for (const stored of await deps.subscriptions.listAll()) {
    try {
      await pushNewNotifications(deps, stored, now, result);
    } catch (error) {
      result.failed += 1;
      console.error('Push job failed for one subscription:', error instanceof Error ? error.message : error);
    }
  }
  return result;
}

async function pushNewNotifications(deps: NotificationJobDeps, stored: StoredPushSubscription, now: Date, result: JobResult) {
  const snapshot = await buildFarmSnapshot(deps, stored.deviceId, now);
  const fresh = snapshot.notifications.filter((item) => !stored.sentIds.includes(item.id));
  if (fresh.length === 0) return;

  for (const item of fresh.slice(0, PUSH_RULES.maxPerRun)) {
    const outcome = await deps.sender.send(stored.subscription, toPayload(item));
    if (outcome === 'gone') {
      await deps.subscriptions.remove(stored.subscription.endpoint);
      result.removed += 1;
      return;
    }
    result.sent += 1;
  }
  // Everything new counts as handled; the rest is visible in the app's सूचनाएँ screen.
  await deps.subscriptions.markSent(stored.subscription.endpoint, fresh.map((item) => item.id), PUSH_RULES.rememberSentIds);
}

function toPayload(item: AppNotification) {
  return { title: item.title, body: item.body, url: item.href, tag: item.id };
}
