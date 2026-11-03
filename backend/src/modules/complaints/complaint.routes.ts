import express, { Router, type Response } from 'express';
import multer from 'multer';
import { COMPLAINT_RULES } from '../../config/complaintRules.js';
import { AppError } from '../../errors/AppError.js';
import { createUserRateLimit } from '../../middleware/userRateLimit.js';
import { detectImageType } from '../../middleware/validateImage.js';
import type { PhotoStorage } from '../../services/storage/photoStorage.js';
import { MAX_IMAGE_BYTES } from '../../types/diagnosis.js';
import { parseOrThrow } from '../../utils/validation.js';
import { audit } from '../audit/audit.service.js';
import { currentUser, requireRole, requireUser } from '../auth/auth.middleware.js';
import type { FeatureFlags } from '../flags/flag.service.js';
import { storePhoto } from '../listings/listing.service.js';
import { Complaints, createComplaintSchema, messageSchema, queueQuerySchema, statusSchema, type ComplaintView } from './complaint.service.js';

const uploadPhoto = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 1 } }).single('image');

/** शिकायत: farmers/buyers/sellers/owners complain and talk; coordinators work the queue. Role before flag. */
export function createComplaintRouter({ flags, photos, now }: { flags: FeatureFlags; photos: PhotoStorage; now?: () => Date }): Router {
  const router = Router();
  const complaints = new Complaints(now);
  const json = express.json({ limit: '8kb' });
  const id = (value: unknown) => String(value);
  router.use('/complaints', requireUser);
  router.use('/admin/complaints', requireRole('coordinator'));
  router.use(['/complaints', '/admin/complaints'], async (req, _res, next) => {
    if (!(await flags.isOn('complaints', req.user))) throw new AppError('FORBIDDEN', 'Feature off');
    next();
  });
  const view = (complaint: Parameters<Complaints['toView']>[0], req: express.Request) => complaints.toView(complaint, currentUser(req));

  router.post('/complaints/photos', createUserRateLimit(COMPLAINT_RULES.rateLimit), uploadPhoto, async (req, res: Response<{ photoId: string }>) => {
    const mimeType = req.file ? detectImageType(req.file.buffer) : null;
    if (!req.file || !mimeType) throw new AppError('INVALID_IMAGE');
    res.status(201).json({ photoId: await storePhoto(photos, currentUser(req).id, { buffer: req.file.buffer, mimeType }) });
  });
  router.post('/complaints', createUserRateLimit(COMPLAINT_RULES.rateLimit), json, async (req, res: Response<{ complaint: ComplaintView }>) => {
    const complaint = await complaints.create(currentUser(req), parseOrThrow(createComplaintSchema, req.body));
    res.status(201).json({ complaint: await view(complaint, req) });
  });
  router.get('/complaints', async (req, res: Response<{ items: ComplaintView[] }>) => {
    const rows = await complaints.listMine(currentUser(req));
    res.json({ items: await Promise.all(rows.map((row) => view(row, req))) });
  });
  router.get('/complaints/:id', async (req, res: Response<{ complaint: ComplaintView }>) => {
    res.json({ complaint: await view(await complaints.find(currentUser(req), id(req.params.id)), req) });
  });
  router.post('/complaints/:id/messages', json, async (req, res: Response<{ complaint: ComplaintView }>) => {
    const { text } = parseOrThrow(messageSchema, req.body);
    const complaint = await complaints.addMessage(currentUser(req), id(req.params.id), text);
    if (currentUser(req).role === 'coordinator') await audit(req, 'complaint.message', { type: 'report', id: complaint._id.toString() });
    res.json({ complaint: await view(complaint, req) });
  });

  router.get('/admin/complaints', async (req, res: Response<{ items: ComplaintView[] }>) => {
    const { status } = parseOrThrow(queueQuerySchema, req.query);
    const rows = await complaints.queue(status);
    res.json({ items: await Promise.all(rows.map((row) => view(row, req))) });
  });
  router.post('/admin/complaints/:id/status', json, async (req, res: Response<{ complaint: ComplaintView; flagged: boolean }>) => {
    const { to, resolution } = parseOrThrow(statusSchema, req.body);
    const { complaint, flagged } = await complaints.transition(currentUser(req), id(req.params.id), to, resolution);
    await audit(req, 'complaint.status', { type: 'report', id: complaint._id.toString() }, { to });
    if (flagged && complaint.againstUserId) await audit(req, 'complaint.flagSeller', { type: 'user', id: complaint.againstUserId.toString() });
    res.json({ complaint: await view(complaint, req), flagged });
  });
  router.post('/admin/users/:id/clear-flag', requireRole('coordinator'), async (req, res: Response<{ ok: true }>) => {
    await complaints.clearFlag(id(req.params.id));
    await audit(req, 'user.clearFlag', { type: 'user', id: id(req.params.id) });
    res.json({ ok: true });
  });
  return router;
}
