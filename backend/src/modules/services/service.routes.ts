import express, { Router, type Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { SERVICE_KIND_RULES, SERVICE_KINDS, SERVICE_RULES, type ServiceKind } from '../../config/serviceKinds.js';
import { AppError } from '../../errors/AppError.js';
import { detectImageType } from '../../middleware/validateImage.js';
import { createUserRateLimit } from '../../middleware/userRateLimit.js';
import type { PhotoStorage } from '../../services/storage/photoStorage.js';
import { MAX_IMAGE_BYTES } from '../../types/diagnosis.js';
import { parseOrThrow } from '../../utils/validation.js';
import { audit } from '../audit/audit.service.js';
import { currentUser, requireRole, requireUser } from '../auth/auth.middleware.js';
import type { AuthUser } from '../auth/auth.types.js';
import type { FeatureFlags } from '../flags/flag.service.js';
import { storePhoto } from '../listings/listing.service.js';
import { ServiceEngine, toBookingView } from './service.service.js';
import {
  bookingBodySchema,
  bookingRatingSchema,
  bookingStepSchema,
  createServiceBodySchema,
  serviceSearchSchema,
  updateServiceBodySchema,
  type BookingView,
  type LabourMatch,
  type OwnServiceView,
  type PublicServiceView,
} from './service.types.js';

const uploadPhoto = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 1 } }).single('image');
const kindQuerySchema = z.object({ kind: z.enum(SERVICE_KINDS).optional() });
const rejectSchema = z.object({ reason: z.string().trim().min(2).max(300) });
const id = (value: unknown) => String(value);

export interface ServiceRouterDeps {
  flags: FeatureFlags;
  photos: PhotoStorage;
  now?: () => Date;
}

/**
 * The one Services engine for machines (equipment), workers (labour) and animals (livestock). Each kind has its
 * own feature flag. Browsing is public; posting, booking and the owner's buttons need a login; approvals are
 * for coordinators. No money moves in the app.
 */
export function createServiceRouter({ flags, photos, now }: ServiceRouterDeps): Router {
  const router = Router();
  const engine = new ServiceEngine(now);
  const json = express.json({ limit: '16kb' });
  const kindOn = async (kind: ServiceKind, user: AuthUser | undefined) => {
    if (!(await flags.isOn(SERVICE_KIND_RULES[kind].flag, user))) throw new AppError('FORBIDDEN', 'Feature off');
  };
  const anyKindOn = async (user: AuthUser | undefined) => {
    for (const kind of SERVICE_KINDS) if (await flags.isOn(SERVICE_KIND_RULES[kind].flag, user)) return;
    throw new AppError('FORBIDDEN', 'Feature off');
  };

  // --- Listings ---
  router.get('/services', async (req, res: Response<{ items: PublicServiceView[]; hasMore: boolean }>) => {
    const query = parseOrThrow(serviceSearchSchema, req.query);
    await kindOn(query.kind, req.user);
    res.json(await engine.search(query));
  });

  router.get('/services/my', requireUser, async (req, res: Response<{ items: OwnServiceView[] }>) => {
    await anyKindOn(req.user);
    res.json({ items: await engine.listOwn(currentUser(req)) });
  });

  router.post('/services/photos', requireUser, createUserRateLimit(SERVICE_RULES.listingRateLimit), uploadPhoto, async (req, res: Response<{ photoId: string }>) => {
    await anyKindOn(req.user);
    const mimeType = req.file ? detectImageType(req.file.buffer) : null;
    if (!req.file || !mimeType) throw new AppError('INVALID_IMAGE');
    res.status(201).json({ photoId: await storePhoto(photos, currentUser(req).id, { buffer: req.file.buffer, mimeType }) });
  });

  router.post('/services', requireUser, createUserRateLimit(SERVICE_RULES.listingRateLimit), json, async (req, res: Response<{ listing: OwnServiceView }>) => {
    const body = parseOrThrow(createServiceBodySchema, req.body);
    await kindOn(body.kind, req.user);
    const user = currentUser(req);
    const listing = await engine.create(user, body);
    res.status(201).json({ listing: (await engine.findVisible(listing._id.toString(), user)) as OwnServiceView });
  });

  router.get('/services/item/:id', async (req, res: Response<{ listing: PublicServiceView | OwnServiceView }>) => {
    const listing = await engine.findVisible(id(req.params.id), req.user);
    await kindOn(listing.kind, req.user);
    res.json({ listing });
  });

  router.patch('/services/item/:id', requireUser, json, async (req, res: Response<{ listing: OwnServiceView }>) => {
    const user = currentUser(req);
    const listing = await engine.update(user, id(req.params.id), parseOrThrow(updateServiceBodySchema, req.body));
    res.json({ listing: (await engine.findVisible(listing._id.toString(), user)) as OwnServiceView });
  });

  router.get('/services/item/:id/matches', requireUser, async (req, res: Response<{ items: LabourMatch[] }>) => {
    await kindOn('labour', req.user);
    res.json({ items: await engine.labourMatches(currentUser(req), id(req.params.id)) });
  });

  // --- Bookings ---
  router.post('/services/item/:id/bookings', requireUser, createUserRateLimit(SERVICE_RULES.bookingRateLimit), json, async (req, res: Response<{ booking: BookingView }>) => {
    const user = currentUser(req);
    const body = parseOrThrow(bookingBodySchema, req.body ?? {});
    const listing = await engine.findVisible(id(req.params.id), user);
    await kindOn(listing.kind, user);
    const booking = await engine.request(user, listing.id, body);
    res.status(201).json({ booking: await toBookingView(booking, user) });
  });

  router.get('/services/bookings', requireUser, async (req, res: Response<{ items: BookingView[] }>) => {
    const user = currentUser(req);
    const { kind } = parseOrThrow(kindQuerySchema, req.query);
    const rows = await engine.listBookings(user, kind);
    res.json({ items: await Promise.all(rows.map((booking) => toBookingView(booking, user))) });
  });

  router.get('/services/bookings/:id', requireUser, async (req, res: Response<{ booking: BookingView }>) => {
    const user = currentUser(req);
    res.json({ booking: await toBookingView(await engine.findBooking(user, id(req.params.id)), user) });
  });

  router.post('/services/bookings/:id/status', requireUser, json, async (req, res: Response<{ booking: BookingView }>) => {
    const user = currentUser(req);
    const { to } = parseOrThrow(bookingStepSchema, req.body);
    const booking = await engine.transition(user, id(req.params.id), to);
    if (user.role === 'coordinator') await audit(req, 'service.booking', { type: 'service', id: booking._id.toString() }, { to });
    res.json({ booking: await toBookingView(booking, user) });
  });

  router.post('/services/bookings/:id/rating', requireUser, json, async (req, res: Response<{ booking: BookingView }>) => {
    const user = currentUser(req);
    const booking = await engine.rate(user, id(req.params.id), parseOrThrow(bookingRatingSchema, req.body));
    res.json({ booking: await toBookingView(booking, user) });
  });

  // --- Coordinator: approvals (animals) ---
  router.get('/admin/services', requireRole('coordinator'), async (_req, res: Response<{ items: OwnServiceView[] }>) => {
    res.json({ items: await engine.pendingApproval() });
  });
  router.post('/admin/services/:id/approve', requireRole('coordinator'), async (req, res: Response<{ ok: true }>) => {
    const listing = await engine.review(id(req.params.id), { approve: true }, currentUser(req).id);
    await audit(req, 'service.approve', { type: 'service', id: listing._id.toString() }, { kind: listing.kind });
    res.json({ ok: true });
  });
  router.post('/admin/services/:id/reject', requireRole('coordinator'), json, async (req, res: Response<{ ok: true }>) => {
    const { reason } = parseOrThrow(rejectSchema, req.body);
    const listing = await engine.review(id(req.params.id), { approve: false, reason }, currentUser(req).id);
    await audit(req, 'service.reject', { type: 'service', id: listing._id.toString() }, { kind: listing.kind, reason });
    res.json({ ok: true });
  });
  return router;
}
