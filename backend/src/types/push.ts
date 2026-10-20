import { z } from 'zod';
import { deviceIdSchema } from './history.js';

/** The browser's PushSubscription.toJSON() shape. */
export const pushSubscriptionSchema = z.object({
  endpoint: z.url({ protocol: /^https$/ }).max(1000),
  keys: z.object({
    p256dh: z.string().min(1).max(200),
    auth: z.string().min(1).max(100),
  }),
});

export type PushSubscriptionData = z.infer<typeof pushSubscriptionSchema>;

export const subscribeBodySchema = z.object({ deviceId: deviceIdSchema, subscription: pushSubscriptionSchema });

export interface StoredPushSubscription {
  deviceId: string;
  subscription: PushSubscriptionData;
  /** Notification ids already pushed to this subscription. */
  sentIds: string[];
}

/** What the service worker shows. */
export interface PushPayload {
  title: string;
  body: string;
  /** Frontend route to open on tap, e.g. "#/weather". */
  url: string;
  tag: string;
}
