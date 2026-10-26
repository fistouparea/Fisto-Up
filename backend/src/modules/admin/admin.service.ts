import { isValidObjectId } from 'mongoose';
import { z } from 'zod';
import { AppError } from '../../errors/AppError.js';
import { escapeRegex } from '../listings/listing.search.js';
import { isLicenceVerified, isSellerProfileComplete, sellerRating, toPlace } from '../auth/accountView.js';
import type { AuthService } from '../auth/auth.service.js';
import { personNameSchema, phoneSchema, pinSchema, SELLER_KINDS, SELLER_STATUSES, type Place, type SellerKind, type SellerStatus } from '../auth/auth.types.js';
import { UserModel, type UserDocument } from '../auth/user.model.js';
import { CommissionEntryModel } from '../commission/commission.model.js';
import { ListingModel } from '../listings/listing.model.js';
import { createListingBodySchema, objectIdSchema } from '../listings/listing.types.js';
import { OrderModel } from '../orders/order.model.js';
import { ORDER_STATUSES, TERMINAL_STATUSES, type OrderStatus } from '../orders/orderStateMachine.js';
import { ReportModel, type ReportReason } from '../reports/report.model.js';
import { placeSchema, upiIdSchema } from '../sellers/seller.types.js';
import { saveSellerProfile } from '../sellers/seller.service.js';

export const sellerListQuerySchema = z.object({
  status: z.enum(SELLER_STATUSES).optional(),
  kind: z.enum(SELLER_KINDS).optional(),
  q: z.string().trim().max(50).optional(),
});

export const rejectBodySchema = z.object({ reason: z.string().trim().min(2).max(300) });
/** Input dealers: the coordinator confirms they checked the licence number (e.g. on the licence paper). */
export const verifyBodySchema = z.object({ licenceChecked: z.boolean().optional() });
export const hideBodySchema = z.object({ reason: z.string().trim().min(2).max(300) });
export const resolveBodySchema = z.object({ resolution: z.string().trim().max(300).optional() });

/** A coordinator signs up a seller who cannot use the app (verified at once: the coordinator met them). */
export const createSellerBodySchema = z.object({
  name: personNameSchema,
  phone: phoneSchema,
  pin: pinSchema,
  village: z.string().trim().min(1).max(60),
  shgName: z.string().trim().min(1).max(80).optional(),
  upiId: upiIdSchema,
  pickup: placeSchema,
});

export const CONSENT_METHODS = ['verbal', 'thumbprint', 'signed'] as const;

/** Assisted listing: the listing plus whose it is and how the seller agreed. */
export const assistedListingBodySchema = createListingBodySchema.and(
  z.object({
    sellerId: objectIdSchema,
    consent: z.object({ method: z.enum(CONSENT_METHODS), note: z.string().trim().max(300).optional() }),
  }),
);

export const adminOrderQuerySchema = z.object({ status: z.enum(ORDER_STATUSES).optional() });

export interface AdminSellerView {
  id: string;
  name: string;
  phone: string;
  status: SellerStatus;
  kind: SellerKind;
  licenceNumber?: string;
  licenceVerified: boolean;
  village?: string;
  shgName?: string;
  upiId?: string;
  pickup?: Place;
  rejectReason?: string;
  profileComplete: boolean;
  listings: number;
  rating: { average: number | null; count: number };
  createdAt: Date;
  assisted: boolean;
}

export async function listSellers(query: z.infer<typeof sellerListQuerySchema>): Promise<AdminSellerView[]> {
  const pattern = query.q ? new RegExp(escapeRegex(query.q), 'i') : null;
  const users = await UserModel.find({
    role: 'seller',
    deletedAt: { $exists: false },
    ...(query.status && { 'seller.status': query.status }),
    // Sellers saved before Phase 5 have no kind: they are producers.
    ...(query.kind === 'input_dealer' && { 'seller.kind': 'input_dealer' }),
    ...(query.kind === 'producer' && { 'seller.kind': { $ne: 'input_dealer' } }),
    ...(pattern && { $or: [{ name: pattern }, { phone: pattern }, { 'seller.village': pattern }] }),
  })
    .sort({ createdAt: -1 })
    .limit(200)
    .exec();
  const counts = await ListingModel.aggregate<{ _id: unknown; count: number }>([
    { $match: { sellerId: { $in: users.map((user) => user._id) } } },
    { $group: { _id: '$sellerId', count: { $sum: 1 } } },
  ]).exec();
  const countById = new Map(counts.map((row) => [String(row._id), row.count]));
  return users.map((user) => toAdminSeller(user, countById.get(user._id.toString()) ?? 0));
}

export function toAdminSeller(user: UserDocument, listings = 0): AdminSellerView {
  const seller = user.seller;
  return {
    id: user._id.toString(),
    name: user.name,
    phone: user.phone,
    status: seller?.status ?? 'pending',
    kind: seller?.kind ?? 'producer',
    ...(seller?.licenceNumber && { licenceNumber: seller.licenceNumber }),
    licenceVerified: isLicenceVerified(seller),
    ...(seller?.village && { village: seller.village }),
    ...(seller?.shgName && { shgName: seller.shgName }),
    ...(seller?.upiId && { upiId: seller.upiId }),
    ...(seller?.pickup && { pickup: toPlace(seller.pickup) }),
    ...(seller?.rejectReason && { rejectReason: seller.rejectReason }),
    profileComplete: isSellerProfileComplete(seller),
    listings,
    rating: sellerRating(seller ?? { ratingSum: 0, ratingCount: 0 }),
    createdAt: user.createdAt,
    assisted: Boolean(user.createdBy),
  };
}

export async function createSellerForSomeone(
  auth: AuthService,
  body: z.infer<typeof createSellerBodySchema>,
  coordinatorId: string,
): Promise<AdminSellerView> {
  const user = await auth.createAccount({
    phone: body.phone,
    pin: body.pin,
    name: body.name,
    role: 'seller',
    createdBy: coordinatorId,
    verifiedBy: coordinatorId,
    pilot: true,
  });
  const saved = await saveSellerProfile(user._id.toString(), {
    name: body.name,
    village: body.village,
    shgName: body.shgName,
    upiId: body.upiId,
    pickup: body.pickup,
  });
  return toAdminSeller(saved);
}

export interface AdminReportView {
  id: string;
  reason: ReportReason;
  text?: string;
  status: 'open' | 'resolved';
  reporter: { name: string; role: string };
  orderId?: string;
  listing?: { id: string; title: string; hidden: boolean; sellerName: string };
  resolution?: string;
  createdAt: Date;
}

/** Open reports first (flagged listings), newest first. */
export async function listReports(status: 'open' | 'resolved' = 'open'): Promise<AdminReportView[]> {
  const reports = await ReportModel.find({ status }).sort({ createdAt: -1 }).limit(200).exec();
  const [users, listings] = await Promise.all([
    UserModel.find({ _id: { $in: reports.map((report) => report.reporterId) } }).exec(),
    ListingModel.find({ _id: { $in: reports.flatMap((report) => (report.listingId ? [report.listingId] : [])) } }).exec(),
  ]);
  const sellers = await UserModel.find({ _id: { $in: listings.map((listing) => listing.sellerId) } }).exec();
  const nameOf = new Map([...users, ...sellers].map((user) => [user._id.toString(), user.name]));
  const listingOf = new Map(listings.map((listing) => [listing._id.toString(), listing]));

  return reports.map((report) => {
    const listing = report.listingId ? listingOf.get(report.listingId.toString()) : undefined;
    return {
      id: report._id.toString(),
      reason: report.reason,
      ...(report.text && { text: report.text }),
      status: report.status,
      reporter: { name: nameOf.get(report.reporterId.toString()) ?? '—', role: report.reporterRole },
      ...(report.orderId && { orderId: report.orderId.toString() }),
      ...(listing && {
        listing: {
          id: listing._id.toString(),
          title: listing.title.hi,
          hidden: listing.hidden ?? false,
          sellerName: nameOf.get(listing.sellerId.toString()) ?? '—',
        },
      }),
      ...(report.resolution && { resolution: report.resolution }),
      createdAt: report.createdAt,
    };
  });
}

export async function resolveReport(reportId: string, coordinatorId: string, resolution?: string): Promise<void> {
  const result = isValidObjectId(reportId)
    ? await ReportModel.updateOne(
        { _id: reportId, status: 'open' },
        { $set: { status: 'resolved', resolvedBy: coordinatorId, resolvedAt: new Date(), resolution } },
      ).exec()
    : null;
  if (!result || result.matchedCount === 0) throw new AppError('NOT_FOUND');
}

/** Hide (with a reason the seller sees) or show again. Hidden listings disappear from the marketplace. */
export async function setListingHidden(listingId: string, hidden: boolean, reason?: string): Promise<void> {
  const result = isValidObjectId(listingId)
    ? await ListingModel.updateOne({ _id: listingId }, hidden ? { $set: { hidden, hiddenReason: reason } } : { $set: { hidden }, $unset: { hiddenReason: 1 } }).exec()
    : null;
  if (!result || result.matchedCount === 0) throw new AppError('NOT_FOUND');
}

export interface MarketStats {
  sellers: { total: number; pending: number; verified: number; rejected: number };
  buyers: number;
  listings: { total: number; visible: number };
  orders: { total: number; open: number; completed: number; byStatus: Partial<Record<OrderStatus, number>> };
  /** Value of completed orders. */
  salesPaise: number;
  commission: { totalPaise: number; collectedPaise: number; duePaise: number };
  openReports: number;
}

export async function marketStats(): Promise<MarketStats> {
  const [sellerRows, buyers, listingsTotal, listingsVisible, orderRows, sales, commission, openReports] = await Promise.all([
    UserModel.aggregate<{ _id: SellerStatus; count: number }>([{ $match: { role: 'seller', deletedAt: { $exists: false } } }, { $group: { _id: '$seller.status', count: { $sum: 1 } } }]).exec(),
    UserModel.countDocuments({ role: 'buyer', deletedAt: { $exists: false } }).exec(),
    ListingModel.countDocuments().exec(),
    ListingModel.countDocuments({ status: 'active', hidden: false, sellerVerified: true, quantityAvailable: { $gt: 0 } }).exec(),
    OrderModel.aggregate<{ _id: OrderStatus; count: number }>([{ $group: { _id: '$status', count: { $sum: 1 } } }]).exec(),
    OrderModel.aggregate<{ total: number }>([{ $match: { status: 'completed' } }, { $group: { _id: null, total: { $sum: '$totalPaise' } } }]).exec(),
    CommissionEntryModel.aggregate<{ total: number; collected: number }>([
      {
        $group: {
          _id: null,
          total: { $sum: '$amountPaise' },
          collected: { $sum: { $cond: [{ $eq: ['$status', 'collected'] }, '$amountPaise', 0] } },
        },
      },
    ]).exec(),
    ReportModel.countDocuments({ status: 'open' }).exec(),
  ]);

  const sellerCount = (status: SellerStatus) => sellerRows.find((row) => row._id === status)?.count ?? 0;
  const byStatus = Object.fromEntries(orderRows.map((row) => [row._id, row.count])) as Partial<Record<OrderStatus, number>>;
  const totalOrders = orderRows.reduce((sum, row) => sum + row.count, 0);
  const finished = orderRows.filter((row) => TERMINAL_STATUSES.includes(row._id)).reduce((sum, row) => sum + row.count, 0);
  const commissionTotal = commission[0]?.total ?? 0;
  const collected = commission[0]?.collected ?? 0;

  return {
    sellers: { total: sellerRows.reduce((sum, row) => sum + row.count, 0), pending: sellerCount('pending'), verified: sellerCount('verified'), rejected: sellerCount('rejected') },
    buyers,
    listings: { total: listingsTotal, visible: listingsVisible },
    orders: { total: totalOrders, open: totalOrders - finished, completed: byStatus.completed ?? 0, byStatus },
    salesPaise: sales[0]?.total ?? 0,
    commission: { totalPaise: commissionTotal, collectedPaise: collected, duePaise: commissionTotal - collected },
    openReports,
  };
}
