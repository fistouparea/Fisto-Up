import express, { Router, type Response } from 'express';
import { z } from 'zod';
import { PushSubscriptionModel } from '../../models/PushSubscription.js';
import { deviceIdSchema } from '../../types/history.js';
import { pushSubscriptionSchema } from '../../types/push.js';
import { parseOrThrow } from '../../utils/validation.js';
import { currentUser, requireUser } from '../auth/auth.middleware.js';
import { objectIdSchema } from '../listings/listing.types.js';
import { listNotifications, markRead, type MarketNotificationView } from './notifier.js';

const readBodySchema = z.object({ ids: z.array(objectIdSchema).max(100).optional() });
const subscribeBodySchema = z.object({ deviceId: deviceIdSchema, subscription: pushSubscriptionSchema });

export function createNotificationRouter(pushEnabled: boolean): Router {
  const router = Router();
  const json = express.json({ limit: '8kb' });

  router.get('/market/notifications', requireUser, async (req, res: Response<{ items: MarketNotificationView[]; unreadCount: number }>) => {
    res.json(await listNotifications(currentUser(req).id));
  });

  router.post('/market/notifications/read', requireUser, json, async (req, res: Response<{ ok: true }>) => {
    const { ids } = parseOrThrow(readBodySchema, req.body ?? {});
    await markRead(currentUser(req).id, ids);
    res.json({ ok: true });
  });

  /** Links this phone's push subscription to the logged-in account (order notifications on the phone). */
  router.post('/market/push/subscribe', requireUser, json, async (req, res: Response<{ ok: boolean }>) => {
    const body = parseOrThrow(subscribeBodySchema, req.body);
    if (!pushEnabled) {
      res.json({ ok: false });
      return;
    }
    await PushSubscriptionModel.updateOne(
      { endpoint: body.subscription.endpoint },
      { $set: { deviceId: body.deviceId, keys: body.subscription.keys, userId: currentUser(req).id }, $setOnInsert: { sentIds: [] } },
      { upsert: true },
    ).exec();
    res.json({ ok: true });
  });
  return router;
}
