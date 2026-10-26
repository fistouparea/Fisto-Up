import { isValidObjectId } from 'mongoose';
import { z } from 'zod';
import { AppError } from '../../errors/AppError.js';
import { deviceIdSchema } from '../../types/history.js';
import type { AuthUser } from '../auth/auth.types.js';
import { phoneSchema } from '../auth/auth.types.js';
import { UserModel } from '../auth/user.model.js';
import type { DeviceDataSource } from '../privacy/privacy.service.js';
import { HELP_CATEGORIES, HelpRequestModel, type HelpCategory } from './help.model.js';
import { track } from '../metrics/events.js';

export const HELP_RULES = {
  messageMax: 1000,
  /** Per IP: stops floods, still generous for a village sharing one mobile IP. */
  rateLimit: { windowMs: 60 * 60_000, limit: 20 },
} as const;

export const helpBodySchema = z.object({
  deviceId: deviceIdSchema,
  category: z.enum(HELP_CATEGORIES),
  message: z.string().trim().min(3).max(HELP_RULES.messageMax),
  callbackPhone: phoneSchema.optional(),
});

export async function createHelpRequest(body: z.infer<typeof helpBodySchema>, user: AuthUser | undefined): Promise<string> {
  const saved = await HelpRequestModel.create({ ...body, userId: user?.id, userRole: user?.role });
  track('help_request', { props: { category: body.category } });
  return saved._id.toString();
}

export interface HelpRequestView {
  id: string;
  category: HelpCategory;
  message: string;
  status: 'open' | 'resolved';
  from: { name: string; role: string } | null;
  /** The account's phone, or the callback number the person gave. Coordinators only. */
  phone?: string;
  resolution?: string;
  createdAt: Date;
}

export async function listHelpRequests(status: 'open' | 'resolved'): Promise<HelpRequestView[]> {
  const rows = await HelpRequestModel.find({ status }).sort({ createdAt: -1 }).limit(200).lean().exec();
  const users = await UserModel.find({ _id: { $in: rows.flatMap((row) => (row.userId ? [row.userId] : [])) } }, { name: 1, phone: 1, role: 1, deletedAt: 1 }).lean().exec();
  const byId = new Map(users.map((user) => [user._id.toString(), user]));
  return rows.map((row) => {
    const user = row.userId ? byId.get(row.userId.toString()) : undefined;
    const phone = user && !user.deletedAt ? user.phone : row.callbackPhone;
    return {
      id: row._id.toString(),
      category: row.category,
      message: row.message,
      status: row.status,
      from: user ? { name: user.name, role: user.role } : null,
      ...(phone && { phone }),
      ...(row.resolution && { resolution: row.resolution }),
      createdAt: row.createdAt,
    };
  });
}

export async function resolveHelpRequest(id: string, coordinatorId: string, resolution?: string): Promise<void> {
  const result = isValidObjectId(id)
    ? await HelpRequestModel.updateOne({ _id: id, status: 'open' }, { $set: { status: 'resolved', resolvedBy: coordinatorId, resolvedAt: new Date(), resolution } }).exec()
    : null;
  if (!result || result.matchedCount === 0) throw new AppError('NOT_FOUND');
}

export const helpDeviceData: DeviceDataSource = {
  name: 'helpRequests',
  export: ({ deviceIds, userId }) =>
    HelpRequestModel.find({ $or: [{ deviceId: { $in: deviceIds } }, ...(userId ? [{ userId }] : [])] }, { _id: 0, category: 1, message: 1, status: 1, resolution: 1, createdAt: 1 })
      .lean()
      .exec(),
  erase: async ({ deviceIds, userId }) =>
    (await HelpRequestModel.deleteMany({ $or: [{ deviceId: { $in: deviceIds } }, ...(userId ? [{ userId }] : [])] }).exec()).deletedCount,
};
