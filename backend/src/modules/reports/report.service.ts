import { isValidObjectId } from 'mongoose';
import { z } from 'zod';
import { AppError } from '../../errors/AppError.js';
import type { AuthUser } from '../auth/auth.types.js';
import { UserModel } from '../auth/user.model.js';
import { objectIdSchema } from '../listings/listing.types.js';
import { ListingModel } from '../listings/listing.model.js';
import { MarketNotificationModel } from '../notifications/notification.model.js';
import { OrderModel } from '../orders/order.model.js';
import { REPORT_REASONS, ReportModel } from './report.model.js';

export const reportBodySchema = z
  .object({
    orderId: objectIdSchema.optional(),
    listingId: objectIdSchema.optional(),
    reason: z.enum(REPORT_REASONS),
    text: z.string().trim().max(500).optional(),
  })
  .refine((body) => Boolean(body.orderId) !== Boolean(body.listingId), 'Report one order or one listing');
export type ReportBody = z.infer<typeof reportBodySchema>;

/**
 * "समस्या बताएँ". Orders: only their buyer or seller may report. Listings: any logged-in user.
 * Every coordinator gets an in-app notification; the listing shows up as flagged on the dashboard.
 */
export async function createReport(reporter: AuthUser, body: ReportBody): Promise<string> {
  let listingId = body.listingId;
  if (body.orderId) {
    const order = await OrderModel.findById(body.orderId).exec();
    if (!order || (!order.buyerId.equals(reporter.id) && !order.sellerId.equals(reporter.id))) throw new AppError('NOT_FOUND');
    listingId = order.listingId.toString();
  } else if (!listingId || !isValidObjectId(listingId) || !(await ListingModel.exists({ _id: listingId }))) {
    throw new AppError('NOT_FOUND');
  }

  const report = await ReportModel.create({
    reporterId: reporter.id,
    reporterRole: reporter.role,
    orderId: body.orderId,
    listingId,
    reason: body.reason,
    text: body.text,
  });

  const coordinators = await UserModel.find({ role: 'coordinator' }).exec();
  await MarketNotificationModel.insertMany(
    coordinators.map((coordinator) => ({
      userId: coordinator._id,
      kind: 'report',
      title: 'नई शिकायत',
      body: `${reporter.name}: ${body.text || body.reason}`,
      href: '#/admin/reports',
    })),
  );
  return report._id.toString();
}
