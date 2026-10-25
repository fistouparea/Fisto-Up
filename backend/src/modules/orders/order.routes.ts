import express, { Router, type Response } from 'express';
import { parseOrThrow } from '../../utils/validation.js';
import { audit } from '../audit/audit.service.js';
import { ORDER_RULES } from '../../config/marketRules.js';
import { createUserRateLimit } from '../../middleware/userRateLimit.js';
import { currentUser, requireRole, requireUser } from '../auth/auth.middleware.js';
import type { OrderService } from './order.service.js';
import { toOrderView } from './order.service.js';
import { createOrderBodySchema, orderListQuerySchema, ratingBodySchema, transitionBodySchema, type OrderView } from './order.types.js';

type OrderResponse = Response<{ order: OrderView }>;

export function createOrderRouter(orders: OrderService): Router {
  const router = Router();
  const json = express.json({ limit: '8kb' });

  router.post('/market/orders', requireRole('buyer'), createUserRateLimit(ORDER_RULES.placeRateLimit), json, async (req, res: OrderResponse) => {
    const user = currentUser(req);
    const order = await orders.placeOrder(user, parseOrThrow(createOrderBodySchema, req.body));
    res.status(201).json({ order: await toOrderView(order, user) });
  });

  router.get('/market/orders', requireUser, async (req, res: Response<{ items: OrderView[]; hasMore: boolean }>) => {
    const user = currentUser(req);
    const { status, page } = parseOrThrow(orderListQuerySchema, req.query);
    const { items, hasMore } = await orders.listMine(user, status, page);
    res.json({ items: await Promise.all(items.map((order) => toOrderView(order, user))), hasMore });
  });

  router.get('/market/orders/:id', requireUser, async (req, res: OrderResponse) => {
    const user = currentUser(req);
    res.json({ order: await toOrderView(await orders.findForViewer(user, String(req.params.id)), user) });
  });

  router.post('/market/orders/:id/status', requireUser, json, async (req, res: OrderResponse) => {
    const user = currentUser(req);
    const { to, paidVia } = parseOrThrow(transitionBodySchema, req.body);
    const order = await orders.transition(user, String(req.params.id), to, paidVia);
    if (user.role === 'coordinator') await audit(req, 'order.transition', { type: 'order', id: order._id.toString() }, { ref: order.ref, to, paidVia });
    res.json({ order: await toOrderView(order, user) });
  });

  router.post('/market/orders/:id/rating', requireRole('buyer'), json, async (req, res: OrderResponse) => {
    const user = currentUser(req);
    const order = await orders.rate(user, String(req.params.id), parseOrThrow(ratingBodySchema, req.body));
    res.json({ order: await toOrderView(order, user) });
  });

  return router;
}
