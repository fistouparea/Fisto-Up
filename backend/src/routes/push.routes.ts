import express, { Router } from 'express';
import { createPushKeyController, createSubscribeController } from '../controllers/push.controller.js';
import type { PushSubscriptionRepository } from '../services/push/pushSubscriptionRepository.js';

export function createPushRouter(publicKey: string | null, subscriptions: PushSubscriptionRepository | null): Router {
  const router = Router();
  router.get('/push/key', createPushKeyController(publicKey));
  router.post('/push/subscribe', express.json({ limit: '4kb' }), createSubscribeController(publicKey ? subscriptions : null));
  return router;
}
