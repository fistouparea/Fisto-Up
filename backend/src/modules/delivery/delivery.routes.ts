import express, { Router, type Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { DELIVERY_RULES, DELIVERY_STEPS } from '../../config/logisticsRules.js';
import { AppError } from '../../errors/AppError.js';
import { createIpRateLimit } from '../../middleware/rateLimit.js';
import { detectImageType } from '../../middleware/validateImage.js';
import type { PhotoStorage } from '../../services/storage/photoStorage.js';
import { MAX_IMAGE_BYTES } from '../../types/diagnosis.js';
import { parseOrThrow } from '../../utils/validation.js';
import { audit } from '../audit/audit.service.js';
import { requireRole } from '../auth/auth.middleware.js';
import type { FeatureFlags } from '../flags/flag.service.js';
import { DeliveryTracking, type DeliveryPageView } from './delivery.service.js';

const uploadProof = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 2 } }).single('photo');
const stepSchema = z.object({ step: z.enum(DELIVERY_STEPS) });

/** Delivery tracking: the coordinator makes a link; the delivery person uses it without any login. */
export function createDeliveryRouter({ flags, photos, now }: { flags: FeatureFlags; photos: PhotoStorage; now?: () => Date }): Router {
  const router = Router();
  const tracking = new DeliveryTracking(now);
  const limit = createIpRateLimit(DELIVERY_RULES.rateLimit);
  const on = async (user: Parameters<FeatureFlags['isOn']>[1]) => {
    if (!(await flags.isOn('deliveryTracking', user))) throw new AppError('FORBIDDEN', 'Feature off');
  };

  router.post('/admin/orders/:id/delivery-link', requireRole('coordinator'), express.json({ limit: '1kb' }), async (req, res: Response<{ token: string; expiresAt: Date }>) => {
    await on(req.user);
    const link = await tracking.createLink(String(req.params.id));
    // The token itself never goes into the audit log.
    await audit(req, 'order.deliveryLink', { type: 'order', id: String(req.params.id) }, { expiresAt: link.expiresAt.toISOString() });
    res.set('Cache-Control', 'no-store').status(201).json(link);
  });

  // The link itself is the permission (no login). Only a coordinator can create one, and only with the flag on.
  router.get('/delivery/:token', limit, async (req, res: Response<{ delivery: DeliveryPageView }>) => {
    res.set('Cache-Control', 'no-store').json({ delivery: await tracking.page(String(req.params.token)) });
  });

  router.post('/delivery/:token/step', limit, uploadProof, async (req, res: Response<{ delivery: DeliveryPageView }>) => {
    const { step } = parseOrThrow(stepSchema, req.body ?? {});
    const mimeType = req.file ? detectImageType(req.file.buffer) : null;
    if (req.file && !mimeType) throw new AppError('INVALID_IMAGE');
    const photo = req.file && mimeType ? { buffer: req.file.buffer, mimeType } : null;
    res.set('Cache-Control', 'no-store').json({ delivery: await tracking.report(String(req.params.token), step, photo, photos) });
  });
  return router;
}
