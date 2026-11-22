import { isValidObjectId, type QueryFilter } from 'mongoose';
import { z } from 'zod';
import { ADMIN_RULES } from '../../config/adminRules.js';
import { AppError } from '../../errors/AppError.js';
import { escapeRegex } from '../listings/listing.search.js';
import { ROLES, type Role, type SellerStatus } from '../auth/auth.types.js';
import { countWaitingListings } from './adminListings.service.js';
import { UserModel, type UserDocument } from '../auth/user.model.js';
import { CommissionEntryModel } from '../commission/commission.model.js';
import { HelpRequestModel } from '../help/help.model.js';
import { OrderModel } from '../orders/order.model.js';
import { ReportModel } from '../reports/report.model.js';
import { NO_UPI_FILTER } from '../sellers/cashPayment.service.js';
import { ServiceListingModel } from '../services/service.model.js';

/** What waits for a coordinator: the panel's home screen and menu badges. Counts only. */
export interface AttentionView {
  pendingSellers: number;
  /** Listings buyers do not see until their seller is verified. */
  waitingListings: number;
  newOrders: number;
  complaints: number;
  overdueComplaints: number;
  helpRequests: number;
  serviceApprovals: number;
  duePaise: number;
  /** Cash payment is off: sellers whose listings are hidden until they get a UPI ID. */
  sellersNeedingUpi: number;
  /** Coordinator accounts of the seed script (their PIN is public in the repository): must not exist on a live site. */
  demoCoordinators: number;
}

export async function attention(cashOn: boolean, now = new Date()): Promise<AttentionView> {
  const live = { deletedAt: { $exists: false } };
  const openComplaint = { status: { $in: ['open', 'in_progress'] as ('open' | 'in_progress')[] } };
  const [pendingSellers, waitingListings, newOrders, complaints, overdueComplaints, helpRequests, serviceApprovals, dues, sellersNeedingUpi, demoCoordinators] = await Promise.all([
    UserModel.countDocuments({ ...live, role: 'seller', 'seller.status': 'pending' }).exec(),
    countWaitingListings(),
    OrderModel.countDocuments({ status: 'requested' }).exec(),
    ReportModel.countDocuments(openComplaint).exec(),
    ReportModel.countDocuments({ ...openComplaint, slaDueAt: { $lt: now } }).exec(),
    HelpRequestModel.countDocuments({ status: 'open' }).exec(),
    ServiceListingModel.countDocuments({ status: 'pending_approval' }).exec(),
    CommissionEntryModel.aggregate<{ total: number }>([{ $match: { status: { $ne: 'collected' } } }, { $group: { _id: null, total: { $sum: '$amountPaise' } } }]).exec(),
    cashOn ? 0 : UserModel.countDocuments({ ...live, ...NO_UPI_FILTER }).exec(),
    UserModel.countDocuments({ ...live, role: 'coordinator', demo: true }).exec(),
  ]);
  return { pendingSellers, waitingListings, newOrders, complaints, overdueComplaints, helpRequests, serviceApprovals, duePaise: dues[0]?.total ?? 0, sellersNeedingUpi, demoCoordinators };
}

export const userListQuerySchema = z.object({
  q: z.string().trim().max(50).optional(),
  role: z.enum(ROLES).optional(),
  /** Only accounts locked after wrong PINs. */
  locked: z.literal('true').optional(),
  page: z.coerce.number().int().min(1).max(500).default(1),
});

/** An account as the panel lists it. Never the PIN hash or the farm data id. */
export interface AdminUserView {
  id: string;
  name: string;
  phone: string;
  role: Role;
  village?: string;
  sellerStatus?: SellerStatus;
  pilot: boolean;
  demo: boolean;
  locked: boolean;
  createdAt: Date;
}

export function toAdminUser(user: UserDocument, now = new Date()): AdminUserView {
  const village = user.seller?.village ?? user.buyer?.village;
  return {
    id: user._id.toString(),
    name: user.name,
    phone: user.phone,
    role: user.role,
    ...(village && { village }),
    ...(user.seller && { sellerStatus: user.seller.status }),
    pilot: Boolean(user.pilot),
    demo: Boolean(user.demo),
    locked: Boolean(user.lockedUntil && user.lockedUntil > now),
    createdAt: user.createdAt,
  };
}

export async function listUsers(
  { q, role, locked, page }: z.infer<typeof userListQuerySchema>,
  now = new Date(),
): Promise<{ items: AdminUserView[]; total: number; hasMore: boolean }> {
  const pattern = q ? new RegExp(escapeRegex(q), 'i') : null;
  const filter: QueryFilter<UserDocument> = {
    deletedAt: { $exists: false },
    ...(role && { role }),
    ...(locked && { lockedUntil: { $gt: now } }),
    ...(pattern && { $or: [{ name: pattern }, { phone: pattern }, { 'seller.village': pattern }, { 'buyer.village': pattern }] }),
  };
  const size = ADMIN_RULES.usersPageSize;
  const [users, total] = await Promise.all([
    UserModel.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * size).limit(size).exec(),
    UserModel.countDocuments(filter).exec(),
  ]);
  return { items: users.map((user) => toAdminUser(user, now)), total, hasMore: page * size < total };
}

/** Lost or shared phone: ends every login of a seller or buyer. Not for coordinators: they could lock each other out. */
export async function endSessions(id: string): Promise<AdminUserView> {
  return changeFarmerAccount(id, { $inc: { tokenVersion: 1 } });
}

/** Too many wrong PINs: the person may try again at once. */
export async function unlockLogin(id: string): Promise<AdminUserView> {
  return changeFarmerAccount(id, { $set: { failedLogins: 0 }, $unset: { lockedUntil: 1 } });
}

async function changeFarmerAccount(id: string, change: Record<string, Record<string, number>>): Promise<AdminUserView> {
  const user = isValidObjectId(id) ? await UserModel.findById(id).exec() : null;
  if (!user || user.deletedAt) throw new AppError('NOT_FOUND');
  if (user.role === 'coordinator') throw new AppError('FORBIDDEN', 'Coordinator accounts are managed on the server');
  const changed = await UserModel.findByIdAndUpdate(id, change, { returnDocument: 'after' }).exec();
  if (!changed) throw new AppError('NOT_FOUND');
  return toAdminUser(changed);
}
