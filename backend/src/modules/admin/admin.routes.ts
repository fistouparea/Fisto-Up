import express, { Router, type Response } from 'express';
import { z } from 'zod';
import { parseOrThrow } from '../../utils/validation.js';
import { audit, auditQuerySchema, listAudit, type AuditEntryView } from '../audit/audit.service.js';
import { currentUser, requireRole } from '../auth/auth.middleware.js';
import type { AuthService } from '../auth/auth.service.js';
import { ledgerCsv, markCollected, monthlyTotals, sellerDues, type MonthTotal, type SellerDues } from '../commission/ledger.service.js';
import { ListingModel } from '../listings/listing.model.js';
import { createListing, toSellerListingView } from '../listings/listing.service.js';
import type { SellerListingView } from '../listings/listing.types.js';
import { OrderModel } from '../orders/order.model.js';
import { toOrderView, type OrderService } from '../orders/order.service.js';
import { deliveryPersonBodySchema, type OrderView } from '../orders/order.types.js';
import { setSellerStatus } from '../sellers/seller.service.js';
import {
  adminOrderQuerySchema,
  assistedListingBodySchema,
  createSellerBodySchema,
  createSellerForSomeone,
  hideBodySchema,
  listReports,
  listSellers,
  sellerListQuerySchema,
  marketStats,
  rejectBodySchema,
  resolveBodySchema,
  resolveReport,
  setListingHidden,
  toAdminSeller,
  type AdminReportView,
  type AdminSellerView,
  type MarketStats,
} from './admin.service.js';

const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const monthQuerySchema = z.object({ month: monthSchema.optional() });
const collectBodySchema = z.object({ sellerId: z.string().min(1), month: monthSchema.optional() });
const reportQuerySchema = z.object({ status: z.enum(['open', 'resolved']).default('open') });
const id = (value: unknown) => String(value);

/** Coordinator panel. Every route checks the coordinator role on the server. */
export function createAdminRouter({ auth, orders, commissionBps }: { auth: AuthService; orders: OrderService; commissionBps: number }): Router {
  const router = Router();
  const json = express.json({ limit: '16kb' });
  router.use('/admin', requireRole('coordinator'));

  router.get('/admin/stats', async (_req, res: Response<MarketStats & { commissionPercent: number }>) => {
    res.json({ ...(await marketStats()), commissionPercent: commissionBps / 100 });
  });

  // --- Sellers ---
  router.get('/admin/sellers', async (req, res: Response<{ items: AdminSellerView[] }>) => {
    res.json({ items: await listSellers(parseOrThrow(sellerListQuerySchema, req.query)) });
  });
  router.post('/admin/sellers', json, async (req, res: Response<{ seller: AdminSellerView }>) => {
    const body = parseOrThrow(createSellerBodySchema, req.body);
    const seller = await createSellerForSomeone(auth, body, currentUser(req).id);
    await audit(req, 'seller.create', { type: 'user', id: seller.id }, { status: seller.status });
    res.status(201).json({ seller });
  });
  router.post('/admin/sellers/:id/verify', json, async (req, res: Response<{ seller: AdminSellerView }>) => {
    const seller = toAdminSeller(await setSellerStatus(id(req.params.id), { status: 'verified' }, currentUser(req).id));
    await audit(req, 'seller.verify', { type: 'user', id: seller.id });
    res.json({ seller });
  });
  router.post('/admin/sellers/:id/reject', json, async (req, res: Response<{ seller: AdminSellerView }>) => {
    const { reason } = parseOrThrow(rejectBodySchema, req.body);
    const seller = toAdminSeller(await setSellerStatus(id(req.params.id), { status: 'rejected', reason }, currentUser(req).id));
    await audit(req, 'seller.reject', { type: 'user', id: seller.id }, { reason });
    res.json({ seller });
  });

  // --- Reports and listing moderation ---
  router.get('/admin/reports', async (req, res: Response<{ items: AdminReportView[] }>) => {
    res.json({ items: await listReports(parseOrThrow(reportQuerySchema, req.query).status) });
  });
  router.post('/admin/reports/:id/resolve', json, async (req, res: Response<{ ok: true }>) => {
    const { resolution } = parseOrThrow(resolveBodySchema, req.body ?? {});
    await resolveReport(id(req.params.id), currentUser(req).id, resolution);
    await audit(req, 'report.resolve', { type: 'report', id: id(req.params.id) }, { resolution });
    res.json({ ok: true });
  });
  router.post('/admin/listings/:id/hide', json, async (req, res: Response<{ ok: true }>) => {
    const { reason } = parseOrThrow(hideBodySchema, req.body);
    await setListingHidden(id(req.params.id), true, reason);
    await audit(req, 'listing.hide', { type: 'listing', id: id(req.params.id) }, { reason });
    res.json({ ok: true });
  });
  router.post('/admin/listings/:id/unhide', async (req, res: Response<{ ok: true }>) => {
    await setListingHidden(id(req.params.id), false);
    await audit(req, 'listing.unhide', { type: 'listing', id: id(req.params.id) });
    res.json({ ok: true });
  });
  router.get('/admin/listings/hidden', async (_req, res: Response<{ items: SellerListingView[] }>) => {
    const listings = await ListingModel.find({ hidden: true }).sort({ updatedAt: -1 }).limit(200).exec();
    res.json({ items: listings.map(toSellerListingView) });
  });

  // --- Assisted listing (seller's consent recorded) ---
  router.post('/admin/listings', json, async (req, res: Response<{ listing: SellerListingView }>) => {
    const { sellerId, consent, ...listing } = parseOrThrow(assistedListingBodySchema, req.body);
    const coordinatorId = currentUser(req).id;
    const created = await createListing(sellerId, listing, { uploaderId: coordinatorId, assisted: { coordinatorId, ...consent } });
    await audit(req, 'listing.createAssisted', { type: 'listing', id: created._id.toString() }, { sellerId, consentMethod: consent.method });
    res.status(201).json({ listing: toSellerListingView(created) });
  });

  // --- Orders board ---
  router.get('/admin/orders', async (req, res: Response<{ items: OrderView[] }>) => {
    const { status } = parseOrThrow(adminOrderQuerySchema, req.query);
    const rows = await OrderModel.find(status ? { status } : {}).sort({ updatedAt: -1 }).limit(300).exec();
    const viewer = currentUser(req);
    res.json({ items: await Promise.all(rows.map((order) => toOrderView(order, viewer))) });
  });
  router.put('/admin/orders/:id/delivery', json, async (req, res: Response<{ order: OrderView }>) => {
    const person = parseOrThrow(deliveryPersonBodySchema, req.body);
    const order = await orders.assignDeliveryPerson(id(req.params.id), person);
    // The delivery person's phone stays out of the log (it is on the order itself).
    await audit(req, 'order.assignDelivery', { type: 'order', id: order._id.toString() }, { ref: order.ref });
    res.json({ order: await toOrderView(order, currentUser(req)) });
  });

  // --- Commission ledger ---
  router.get('/admin/commission/months', async (_req, res: Response<{ items: MonthTotal[] }>) => {
    res.json({ items: await monthlyTotals() });
  });
  router.get('/admin/commission', async (req, res: Response<{ month: string | null; items: SellerDues[] }>) => {
    const { month } = parseOrThrow(monthQuerySchema, req.query);
    res.json({ month: month ?? null, items: await sellerDues(month) });
  });
  router.post('/admin/commission/collect', json, async (req, res: Response<{ entries: number; amountPaise: number }>) => {
    const { sellerId, month } = parseOrThrow(collectBodySchema, req.body);
    const collected = await markCollected(sellerId, currentUser(req).id, month);
    await audit(req, 'commission.collect', { type: 'user', id: sellerId }, { month: month ?? 'all', ...collected });
    res.json(collected);
  });
  router.get('/admin/commission/export.csv', async (req, res) => {
    const { month } = parseOrThrow(monthQuerySchema, req.query);
    const csv = await ledgerCsv(month);
    await audit(req, 'commission.export', { type: 'commission', id: month ?? 'all' });
    res
      .type('text/csv; charset=utf-8')
      .set('Content-Disposition', `attachment; filename="agriai-commission-${month ?? 'all'}.csv"`)
      .set('Cache-Control', 'no-store')
      .send(csv);
  });

  // --- Audit log (read-only) ---
  router.get('/admin/audit', async (req, res: Response<{ items: AuditEntryView[]; hasMore: boolean }>) => {
    res.json(await listAudit(parseOrThrow(auditQuerySchema, req.query)));
  });

  return router;
}
