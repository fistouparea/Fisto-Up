import { isValidObjectId, Types } from 'mongoose';
import { z } from 'zod';
import { COMPLAINT_RULES, COMPLAINT_STATUSES, COMPLAINT_TEXTS, COMPLAINT_TRANSITIONS, type ComplaintStatus } from '../../config/complaintRules.js';
import { AppError } from '../../errors/AppError.js';
import type { AuthUser } from '../auth/auth.types.js';
import { UserModel } from '../auth/user.model.js';
import { ListingModel, ListingPhotoModel } from '../listings/listing.model.js';
import { objectIdSchema } from '../listings/listing.types.js';
import { photoUrl } from '../listings/listing.service.js';
import { MarketNotificationModel } from '../notifications/notification.model.js';
import { OrderModel } from '../orders/order.model.js';
import { REPORT_REASONS, ReportModel, type ReportReason } from '../reports/report.model.js';
import { ServiceBookingModel, ServiceListingModel } from '../services/service.model.js';

export const COMPLAINT_TARGETS = ['order', 'booking', 'listing', 'serviceListing'] as const;
export type ComplaintTarget = (typeof COMPLAINT_TARGETS)[number];

export const createComplaintSchema = z.object({
  target: z.object({ kind: z.enum(COMPLAINT_TARGETS), id: objectIdSchema }),
  category: z.enum(REPORT_REASONS),
  text: z.string().trim().min(3).max(COMPLAINT_RULES.maxTextLength),
  photoId: objectIdSchema.optional(),
});
export const messageSchema = z.object({ text: z.string().trim().min(1).max(COMPLAINT_RULES.maxMessageLength) });
export const statusSchema = z
  .object({ to: z.enum(COMPLAINT_STATUSES), resolution: z.string().trim().min(3).max(500).optional() })
  .refine((body) => body.to === 'in_progress' || body.resolution !== undefined, { message: 'A resolution note is needed', path: ['resolution'] });
export const queueQuerySchema = z.object({ status: z.enum(COMPLAINT_STATUSES).optional() });

export type ComplaintRole = 'reporter' | 'against' | 'coordinator';

export interface ComplaintView {
  id: string;
  category: ReportReason;
  text?: string;
  status: ComplaintStatus;
  target: { kind: ComplaintTarget; id: string; title: string };
  reporter: { name: string; role: string };
  against?: { name: string };
  photoUrl?: string;
  messages: { fromRole: string; text: string; at: Date; mine: boolean }[];
  resolution?: string;
  slaDueAt?: Date;
  /** Not closed and past the SLA time. */
  overdue: boolean;
  viewerRole: ComplaintRole;
  allowedNext: ComplaintStatus[];
  createdAt: Date;
}

type ReportDoc = InstanceType<typeof ReportModel>;

export class Complaints {
  constructor(private readonly now: () => Date = () => new Date()) {}

  /**
   * One complaint flow for orders, bookings and listings. Orders and bookings: only their two sides may complain,
   * and the complaint is about the other side. Listings: any logged-in person, about the seller/owner.
   */
  async create(reporter: AuthUser, body: z.infer<typeof createComplaintSchema>): Promise<ReportDoc> {
    const target = await resolveTarget(reporter, body.target.kind, body.target.id);
    const id = new Types.ObjectId();
    if (body.photoId) {
      const claimed = await ListingPhotoModel.updateOne({ _id: body.photoId, ownerId: reporter.id, attached: false }, { $set: { attached: true, complaintId: id } }).exec();
      if (claimed.modifiedCount !== 1) throw new AppError('INVALID_INPUT', 'Photo missing, expired or not yours');
    }
    const now = this.now();
    const complaint = await ReportModel.create({
      _id: id,
      reporterId: reporter.id,
      reporterRole: reporter.role,
      ...target.refs,
      ...(target.againstUserId && { againstUserId: target.againstUserId }),
      reason: body.category,
      text: body.text,
      ...(body.photoId && { photoId: body.photoId }),
      status: 'open',
      slaDueAt: new Date(now.getTime() + COMPLAINT_RULES.slaHours * 3_600_000),
      statusHistory: [{ status: 'open', at: now, byUserId: reporter.id }],
    });
    await notifyCoordinators(COMPLAINT_TEXTS.newTitle, `${reporter.name}: ${body.text}`.slice(0, 200), '#/admin/complaints');
    return complaint;
  }

  async find(viewer: AuthUser, id: string): Promise<ReportDoc> {
    const complaint = isValidObjectId(id) ? await ReportModel.findById(id).exec() : null;
    if (!complaint || !roleOf(viewer, complaint)) throw new AppError('NOT_FOUND');
    return complaint;
  }

  /** Complaints I made and complaints about me (so I can answer), newest first. */
  async listMine(user: AuthUser): Promise<ReportDoc[]> {
    return ReportModel.find({ $or: [{ reporterId: user.id }, { againstUserId: user.id }] }).sort({ createdAt: -1 }).limit(100).exec();
  }

  /** Coordinator queue: open ones first, the most urgent SLA first. */
  async queue(status: ComplaintStatus | undefined): Promise<ReportDoc[]> {
    return ReportModel.find(status ? { status } : { status: { $in: ['open', 'in_progress'] } })
      .sort({ slaDueAt: 1, createdAt: 1 })
      .limit(300)
      .exec();
  }

  /** Reporter, the other side or a coordinator write into the complaint while it is not closed. */
  async addMessage(viewer: AuthUser, id: string, text: string): Promise<ReportDoc> {
    const complaint = await this.find(viewer, id);
    const role = roleOf(viewer, complaint);
    const updated = await ReportModel.findOneAndUpdate(
      { _id: complaint._id, status: { $in: ['open', 'in_progress'] }, [`messages.${COMPLAINT_RULES.maxMessages - 1}`]: { $exists: false } },
      { $push: { messages: { fromUserId: viewer.id, fromRole: viewer.role, text, at: this.now() } } },
      { returnDocument: 'after' },
    ).exec();
    if (!updated) throw new AppError('INVALID_TRANSITION', 'Complaint closed or too many messages');
    const others = [complaint.reporterId, complaint.againstUserId].filter((userId): userId is Types.ObjectId => Boolean(userId) && !userId?.equals(viewer.id));
    await MarketNotificationModel.insertMany(others.map((userId) => ({ userId, kind: 'complaint', title: COMPLAINT_TEXTS.message, body: text.slice(0, 200), href: `#/complaints/${complaint._id.toString()}` })));
    if (role !== 'coordinator') await notifyCoordinators(COMPLAINT_TEXTS.message, text.slice(0, 200), '#/admin/complaints', viewer.id);
    return updated;
  }

  /**
   * Coordinator: one step (open → in_progress → resolved/rejected). Both sides are told. A valid (resolved)
   * complaint counts against the seller/owner; at COMPLAINT_RULES.flagThreshold in the window they are flagged.
   */
  async transition(coordinator: AuthUser, id: string, to: ComplaintStatus, resolution?: string): Promise<{ complaint: ReportDoc; flagged: boolean }> {
    const complaint = await this.find(coordinator, id);
    if (!COMPLAINT_TRANSITIONS[complaint.status].includes(to)) throw new AppError('INVALID_TRANSITION');
    const now = this.now();
    const closing = to === 'resolved' || to === 'rejected';
    const updated = await ReportModel.findOneAndUpdate(
      { _id: complaint._id, status: complaint.status },
      {
        $set: { status: to, ...(closing && { resolvedBy: coordinator.id, resolvedAt: now, resolution }) },
        $push: { statusHistory: { status: to, at: now, byUserId: coordinator.id } },
      },
      { returnDocument: 'after' },
    ).exec();
    if (!updated) throw new AppError('INVALID_TRANSITION', 'Complaint changed meanwhile');

    const people = [updated.reporterId, updated.againstUserId].filter((userId): userId is Types.ObjectId => Boolean(userId));
    await MarketNotificationModel.insertMany(
      people.map((userId) => ({ userId, kind: 'complaint', title: COMPLAINT_TEXTS.status[to], body: resolution ?? COMPLAINT_TEXTS.status[to], href: `#/complaints/${updated._id.toString()}` })),
    );
    const flagged = to === 'resolved' && updated.againstUserId ? await this.flagIfRepeated(updated.againstUserId) : false;
    return { complaint: updated, flagged };
  }

  /** Counts valid complaints in the window; flags the person once (a coordinator clears it after review). */
  private async flagIfRepeated(userId: Types.ObjectId): Promise<boolean> {
    const since = new Date(this.now().getTime() - COMPLAINT_RULES.flagWindowDays * 86_400_000);
    const count = await ReportModel.countDocuments({ againstUserId: userId, status: 'resolved', resolvedAt: { $gte: since } }).exec();
    if (count < COMPLAINT_RULES.flagThreshold) return false;
    const changed = await UserModel.updateOne({ _id: userId, flaggedForReview: { $exists: false } }, { $set: { flaggedForReview: { at: this.now(), complaints: count } } }).exec();
    if (changed.modifiedCount === 0) return false;
    const user = await UserModel.findById(userId, { name: 1 }).lean().exec();
    await notifyCoordinators(COMPLAINT_TEXTS.flagged, `${user?.name ?? '—'}: ${count} सही शिकायतें`, '#/admin/sellers');
    return true;
  }

  /** After a review the coordinator clears the flag (it can be raised again by new complaints). */
  async clearFlag(userId: string): Promise<void> {
    const result = isValidObjectId(userId) ? await UserModel.updateOne({ _id: userId }, { $unset: { flaggedForReview: 1 } }).exec() : null;
    if (!result || result.matchedCount === 0) throw new AppError('NOT_FOUND');
  }

  async toView(complaint: ReportDoc, viewer: AuthUser): Promise<ComplaintView> {
    const viewerRole = roleOf(viewer, complaint) ?? 'coordinator';
    const [reporter, against, title] = await Promise.all([
      UserModel.findById(complaint.reporterId, { name: 1 }).lean().exec(),
      complaint.againstUserId ? UserModel.findById(complaint.againstUserId, { name: 1 }).lean().exec() : null,
      targetTitle(complaint),
    ]);
    const closed = complaint.status === 'resolved' || complaint.status === 'rejected';
    return {
      id: complaint._id.toString(),
      category: complaint.reason,
      ...(complaint.text && { text: complaint.text }),
      status: complaint.status,
      target: { ...targetOf(complaint), title },
      reporter: { name: reporter?.name ?? '—', role: complaint.reporterRole },
      ...(against && { against: { name: against.name } }),
      ...(complaint.photoId && { photoUrl: photoUrl(complaint.photoId) }),
      messages: complaint.messages.map((message) => ({ fromRole: message.fromRole, text: message.text, at: message.at, mine: message.fromUserId.equals(viewer.id) })),
      ...(complaint.resolution && { resolution: complaint.resolution }),
      ...(complaint.slaDueAt && { slaDueAt: complaint.slaDueAt }),
      overdue: !closed && Boolean(complaint.slaDueAt && complaint.slaDueAt < this.now()),
      viewerRole,
      allowedNext: viewerRole === 'coordinator' ? [...COMPLAINT_TRANSITIONS[complaint.status]] : [],
      createdAt: complaint.createdAt,
    };
  }
}

function roleOf(viewer: AuthUser, complaint: ReportDoc): ComplaintRole | null {
  if (viewer.role === 'coordinator') return 'coordinator';
  if (complaint.reporterId.equals(viewer.id)) return 'reporter';
  if (complaint.againstUserId?.equals(viewer.id)) return 'against';
  return null;
}

/** Which record the complaint is about, and who it is against. Unknown or someone else's record: NOT_FOUND. */
async function resolveTarget(reporter: AuthUser, kind: ComplaintTarget, id: string) {
  switch (kind) {
    case 'order': {
      const order = await OrderModel.findById(id).exec();
      if (!order || (!order.buyerId.equals(reporter.id) && !order.sellerId.equals(reporter.id))) throw new AppError('NOT_FOUND');
      return { refs: { orderId: order._id, listingId: order.listingId }, againstUserId: order.buyerId.equals(reporter.id) ? order.sellerId : order.buyerId };
    }
    case 'booking': {
      const booking = await ServiceBookingModel.findById(id).exec();
      if (!booking || (!booking.ownerId.equals(reporter.id) && !booking.requesterId.equals(reporter.id))) throw new AppError('NOT_FOUND');
      return { refs: { bookingId: booking._id, serviceListingId: booking.listingId }, againstUserId: booking.requesterId.equals(reporter.id) ? booking.ownerId : booking.requesterId };
    }
    case 'listing': {
      const listing = await ListingModel.findById(id).exec();
      if (!listing || listing.sellerId.equals(reporter.id)) throw new AppError('NOT_FOUND');
      return { refs: { listingId: listing._id }, againstUserId: listing.sellerId };
    }
    case 'serviceListing': {
      const listing = await ServiceListingModel.findById(id).exec();
      if (!listing || listing.ownerId.equals(reporter.id)) throw new AppError('NOT_FOUND');
      return { refs: { serviceListingId: listing._id }, againstUserId: listing.ownerId };
    }
  }
}

function targetOf(complaint: ReportDoc): { kind: ComplaintTarget; id: string } {
  if (complaint.orderId) return { kind: 'order', id: complaint.orderId.toString() };
  if (complaint.bookingId) return { kind: 'booking', id: complaint.bookingId.toString() };
  if (complaint.serviceListingId) return { kind: 'serviceListing', id: complaint.serviceListingId.toString() };
  return { kind: 'listing', id: complaint.listingId?.toString() ?? '' };
}

async function targetTitle(complaint: ReportDoc): Promise<string> {
  if (complaint.orderId) {
    const order = await OrderModel.findById(complaint.orderId, { ref: 1, item: 1 }).lean().exec();
    return order ? `${order.item.title.hi} (${order.ref})` : '—';
  }
  if (complaint.bookingId) return (await ServiceBookingModel.findById(complaint.bookingId, { title: 1 }).lean().exec())?.title ?? '—';
  if (complaint.serviceListingId) return (await ServiceListingModel.findById(complaint.serviceListingId, { title: 1 }).lean().exec())?.title ?? '—';
  if (complaint.listingId) return (await ListingModel.findById(complaint.listingId, { title: 1 }).lean().exec())?.title.hi ?? '—';
  return '—';
}

async function notifyCoordinators(title: string, body: string, href: string, exceptUserId?: string): Promise<void> {
  const coordinators = await UserModel.find({ role: 'coordinator', deletedAt: { $exists: false } }, { _id: 1 }).lean().exec();
  const rows = coordinators.filter((user) => user._id.toString() !== exceptUserId).map((user) => ({ userId: user._id, kind: 'complaint', title, body, href }));
  if (rows.length > 0) await MarketNotificationModel.insertMany(rows);
}
