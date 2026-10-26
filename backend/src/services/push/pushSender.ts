import webpush, { WebPushError } from 'web-push';
import type { VapidConfig } from '../../config/env.js';
import type { PushPayload, PushSubscriptionData } from '../../types/push.js';
import { withRetry } from '../../utils/retry.js';

/** "gone" = the subscription expired or was revoked and should be deleted. */
export type PushResult = 'sent' | 'gone';

export interface PushSender {
  send(subscription: PushSubscriptionData, payload: PushPayload): Promise<PushResult>;
}

/** Sends via the free Web Push protocol (browser push services), signed with our VAPID keys. */
export class WebPushSender implements PushSender {
  constructor(
    private readonly vapid: VapidConfig,
    /** Injected in tests to skip the wait before the retry. */
    private readonly sleep?: (ms: number) => Promise<void>,
  ) {}

  async send(subscription: PushSubscriptionData, payload: PushPayload): Promise<PushResult> {
    try {
      await withRetry(
        () =>
          webpush.sendNotification(subscription, JSON.stringify(payload), {
            vapidDetails: this.vapid,
            TTL: 12 * 60 * 60, // a weather alert is useless after half a day
            timeout: 10_000,
          }),
        { maxAttempts: 2, baseDelayMs: 1_000, sleep: this.sleep, isRetryable: isPushServiceBusy },
      );
      return 'sent';
    } catch (error) {
      if (error instanceof WebPushError && (error.statusCode === 404 || error.statusCode === 410)) return 'gone';
      throw error;
    }
  }
}

/** The browser's push service is overloaded or briefly down (not: the subscription is gone or our request is bad). */
function isPushServiceBusy(error: unknown): boolean {
  if (error instanceof WebPushError) return error.statusCode === 429 || error.statusCode >= 500;
  return true; // network error
}
