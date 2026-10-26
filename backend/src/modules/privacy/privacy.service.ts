import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { CONSENT_VERSION, DELETED_NAME } from '../../config/privacy.js';
import { AppError } from '../../errors/AppError.js';
import { DiagnosisRecord } from '../../models/DiagnosisRecord.js';
import { FarmProfileModel } from '../../models/FarmProfile.js';
import { PushSubscriptionModel } from '../../models/PushSubscription.js';
import { logger } from '../../observability/logger.js';
import type { PhotoStorage } from '../../services/storage/photoStorage.js';
import type { AuthUser } from '../auth/auth.types.js';
import { UserModel } from '../auth/user.model.js';
import { ListingModel, ListingPhotoModel } from '../listings/listing.model.js';
import { MarketNotificationModel } from '../notifications/notification.model.js';
import { OrderModel } from '../orders/order.model.js';
import { TERMINAL_STATUSES } from '../orders/orderStateMachine.js';
import { ReportModel } from '../reports/report.model.js';
import { ConsentModel, DeletionLogModel } from './privacy.model.js';

export interface ConsentView {
  version: string;
  acceptedAt: Date;
  /** False when the text changed since: ask again. */
  current: boolean;
}

export async function recordConsent(deviceId: string, lang: 'hi' | 'en', now = new Date()): Promise<ConsentView> {
  await ConsentModel.create({ deviceId, version: CONSENT_VERSION, lang, acceptedAt: now });
  return { version: CONSENT_VERSION, acceptedAt: now, current: true };
}

export async function latestConsent(deviceId: string): Promise<ConsentView | null> {
  const row = await ConsentModel.findOne({ deviceId }).sort({ acceptedAt: -1 }).lean().exec();
  return row ? { version: row.version, acceptedAt: row.acceptedAt, current: row.version === CONSENT_VERSION } : null;
}

/**
 * Every data use on our side, so a person can see what is stored about them (also the extra data
 * coordinators added, e.g. a delivery person). Never PIN hashes, session data or other people's phone numbers.
 */
export async function exportPersonalData(deviceId: string, user: AuthUser | undefined, extraDeviceData: DeviceDataSource[] = []) {
  const deviceIds = await deviceIdsOf(deviceId, user);
  const [farmProfiles, diagnoses, consents, pushSubscriptions, extra] = await Promise.all([
    FarmProfileModel.find({ deviceId: { $in: deviceIds } }, { _id: 0, deviceId: 0 }).lean().exec(),
    DiagnosisRecord.find({ deviceId: { $in: deviceIds } }, { _id: 0, deviceId: 0 }).sort({ createdAt: -1 }).lean().exec(),
    ConsentModel.find({ deviceId: { $in: deviceIds } }, { _id: 0, version: 1, lang: 1, acceptedAt: 1 }).sort({ acceptedAt: -1 }).lean().exec(),
    PushSubscriptionModel.countDocuments({ deviceId: { $in: deviceIds } }).exec(),
    Promise.all(extraDeviceData.map(async (source) => [source.name, await source.export({ deviceIds, userId: user?.id })] as const)),
  ]);

  return {
    exportedAt: new Date(),
    note: 'AgriAI: आपका सारा डेटा / all your data',
    device: { farmProfile: farmProfiles[0] ?? null, diagnoses, consents, pushSubscriptions, ...Object.fromEntries(extra) },
    account: user ? await exportAccount(user.id) : null,
  };
}

async function exportAccount(userId: string) {
  const account = await UserModel.findById(userId, { pinHash: 0, tokenVersion: 0, failedLogins: 0, lockedUntil: 0, deviceId: 0 }).lean().exec();
  if (!account) return null;
  const [listings, orders, reports, notifications] = await Promise.all([
    ListingModel.find({ sellerId: userId }, { photoIds: 0, location: 0 }).lean().exec(),
    OrderModel.find({ $or: [{ buyerId: userId }, { sellerId: userId }] }).sort({ createdAt: -1 }).lean().exec(),
    ReportModel.find({ reporterId: userId }, { reason: 1, text: 1, status: 1, createdAt: 1 }).lean().exec(),
    MarketNotificationModel.find({ userId }, { _id: 0, title: 1, body: 1, createdAt: 1 }).sort({ createdAt: -1 }).limit(200).lean().exec(),
  ]);
  return {
    phone: account.phone,
    name: account.name,
    role: account.role,
    createdAt: account.createdAt,
    seller: account.seller ?? null,
    buyer: account.buyer ?? null,
    listings,
    orders: orders.map((order) => ({
      ref: order.ref,
      as: order.buyerId.equals(userId) ? 'buyer' : 'seller',
      status: order.status,
      item: order.item.title,
      quantity: order.quantity,
      unit: order.item.unit,
      totalPaise: order.totalPaise,
      fulfilment: order.fulfilment,
      deliveryAddress: order.buyerId.equals(userId) ? order.deliveryAddress : undefined,
      note: order.note,
      rating: order.rating,
      createdAt: order.createdAt,
    })),
    reports,
    notifications,
  };
}

/** Device-linked data of later features (feedback, events): how to export and erase it. */
export interface DataScope {
  deviceIds: string[];
  /** The logged-in account, if any. */
  userId?: string;
}

export interface DeviceDataSource {
  name: string;
  export(scope: DataScope): Promise<unknown>;
  /** Deletes or anonymizes; returns how many records were touched. */
  erase(scope: DataScope): Promise<number>;
}

export interface DeletionResult {
  device: Record<string, number>;
  account: Record<string, number> | null;
}

/**
 * "मेरा डेटा मिटाएँ". Deletes everything about this phone (and the account, when logged in):
 * farm profile, diagnoses, consents, push subscriptions, listings' photos, notifications.
 * Orders stay for the seller's/buyer's and our accounting records, but without the person's name, village,
 * address or notes ("हटाया गया खाता"). The phone number is removed, so it can be registered again.
 * Accounts with orders still running must finish or cancel them first (ACTIVE_ORDERS).
 */
export async function deletePersonalData(
  deviceId: string,
  user: AuthUser | undefined,
  storage: PhotoStorage,
  extraDeviceData: DeviceDataSource[] = [],
  now = new Date(),
): Promise<DeletionResult> {
  if (user?.role === 'coordinator') throw new AppError('FORBIDDEN', 'Coordinator accounts are removed by an administrator');
  if (user) {
    const running = await OrderModel.exists({ $or: [{ buyerId: user.id }, { sellerId: user.id }], status: { $nin: TERMINAL_STATUSES } }).exec();
    if (running) throw new AppError('ACTIVE_ORDERS');
  }

  const deviceIds = await deviceIdsOf(deviceId, user);
  const account = user ? await deleteAccount(user.id, storage) : null;
  const [profiles, diagnoses, consents, push, ...extra] = await Promise.all([
    FarmProfileModel.deleteMany({ deviceId: { $in: deviceIds } }).exec(),
    DiagnosisRecord.deleteMany({ deviceId: { $in: deviceIds } }).exec(),
    ConsentModel.deleteMany({ deviceId: { $in: deviceIds } }).exec(),
    PushSubscriptionModel.deleteMany({ deviceId: { $in: deviceIds } }).exec(),
    ...extraDeviceData.map((source) => source.erase({ deviceIds, userId: user?.id })),
  ]);
  const device = {
    farmProfiles: profiles.deletedCount,
    diagnoses: diagnoses.deletedCount,
    consents: consents.deletedCount,
    pushSubscriptions: push.deletedCount,
    ...Object.fromEntries(extraDeviceData.map((source, index) => [source.name, extra[index] ?? 0])),
  };
  await DeletionLogModel.create({ at: now, scope: user ? 'account' : 'device', role: user?.role, counts: { ...device, ...account } });
  return { device, account };
}

/** This phone's id plus the one linked to the account (another phone may have created the farm profile). */
async function deviceIdsOf(deviceId: string, user: AuthUser | undefined): Promise<string[]> {
  const linked = user ? (await UserModel.findById(user.id, { deviceId: 1 }).lean().exec())?.deviceId : undefined;
  return [...new Set([deviceId, ...(linked ? [linked] : [])])];
}

async function deleteAccount(userId: string, storage: PhotoStorage): Promise<Record<string, number>> {
  const listings = await ListingModel.find({ sellerId: userId }, { _id: 1 }).lean().exec();
  const listingIds = listings.map((listing) => listing._id);
  const photos = await ListingPhotoModel.find({ $or: [{ ownerId: userId }, { listingId: { $in: listingIds } }] }, { storageKey: 1 }).lean().exec();
  for (const photo of photos) {
    if (photo.storageKey) await storage.remove(photo.storageKey).catch((error: unknown) => logger.error({ err: error }, 'photo of deleted account not removed at provider'));
  }

  // All-or-nothing on a replica set; on a standalone server the steps are each safe to repeat.
  const run = async (session: mongoose.ClientSession | null) => {
    const opts = session ? { session } : {};
    // One after another: operations inside a transaction must not run in parallel.
    const photoResult = await ListingPhotoModel.deleteMany({ _id: { $in: photos.map((photo) => photo._id) } }, opts).exec();
    // Listings stay (orders point to them) but leave the market and carry nothing personal.
    const listingResult = await ListingModel.updateMany(
      { sellerId: userId },
      { $set: { status: 'paused', hidden: true, hiddenReason: DELETED_NAME, photoIds: [], description: { hi: '', en: '' } }, $unset: { assisted: 1 } },
      opts,
    ).exec();
    const buyerOrders = await OrderModel.updateMany(
      { buyerId: userId },
      { $set: { 'buyer.name': DELETED_NAME }, $unset: { 'buyer.village': 1, deliveryAddress: 1, note: 1, 'rating.comment': 1 } },
      opts,
    ).exec();
    const sellerOrders = await OrderModel.updateMany({ sellerId: userId }, { $set: { 'seller.name': DELETED_NAME }, $unset: { 'seller.village': 1 } }, opts).exec();
    const reports = await ReportModel.updateMany({ reporterId: userId }, { $unset: { text: 1 } }, opts).exec();
    const notifications = await MarketNotificationModel.deleteMany({ userId }, opts).exec();
    const push = await PushSubscriptionModel.deleteMany({ userId }, opts).exec();
    // The account row stays (orders and the commission ledger point to it), emptied and unusable.
    await UserModel.updateOne(
      { _id: userId },
      {
        $set: { name: DELETED_NAME, phone: `deleted-${randomBytes(12).toString('hex')}`, pinHash: randomBytes(32).toString('hex'), deletedAt: new Date() },
        $inc: { tokenVersion: 1 },
        $unset: { deviceId: 1, buyer: 1, 'seller.village': 1, 'seller.shgName': 1, 'seller.upiId': 1, 'seller.pickup': 1, 'seller.rejectReason': 1, lockedUntil: 1 },
      },
      opts,
    ).exec();
    return {
      photos: photoResult.deletedCount,
      listings: listingResult.modifiedCount,
      ordersAnonymized: buyerOrders.modifiedCount + sellerOrders.modifiedCount,
      reports: reports.modifiedCount,
      notifications: notifications.deletedCount,
      accountPushSubscriptions: push.deletedCount,
    };
  };

  try {
    return await mongoose.connection.transaction((session) => run(session));
  } catch (error) {
    if (error instanceof Error && /replica set member or mongos|does not support retryable writes/i.test(error.message)) return run(null);
    throw error;
  }
}
