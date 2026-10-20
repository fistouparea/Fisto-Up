import type { RequestHandler, Response } from 'express';
import type { PushSubscriptionRepository } from '../services/push/pushSubscriptionRepository.js';
import { subscribeBodySchema } from '../types/push.js';
import { parseOrThrow, requireRepository } from '../utils/validation.js';

/** GET /api/push/key — the public VAPID key, or null when push is not configured. */
export function createPushKeyController(publicKey: string | null): RequestHandler {
  return (_req, res: Response<{ publicKey: string | null }>) => {
    res.json({ publicKey });
  };
}

/** POST /api/push/subscribe — saves the phone's push subscription. */
export function createSubscribeController(subscriptions: PushSubscriptionRepository | null): RequestHandler {
  return async (req, res: Response<{ ok: true }>) => {
    const body = parseOrThrow(subscribeBodySchema, req.body);
    await requireRepository(subscriptions).save(body.deviceId, body.subscription);
    res.json({ ok: true });
  };
}
