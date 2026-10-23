import type { ClientSession, Types } from 'mongoose';
import { orderMessage, type Audience } from '../../config/marketMessages.js';
import { UNIT_NAMES, PRODUCTS } from '../../config/marketCatalog.js';
import { NOTIFICATION_RULES } from '../../config/marketRules.js';
import { PushSubscriptionModel } from '../../models/PushSubscription.js';
import type { PushSender } from '../../services/push/pushSender.js';
import type { PushPayload } from '../../types/push.js';
import { UserModel } from '../auth/user.model.js';
import type { OrderDocument } from '../orders/order.model.js';
import type { OrderStatus } from '../orders/orderStateMachine.js';
import { MarketNotificationModel } from './notification.model.js';

export interface PendingPush {
  userId: string;
  payload: PushPayload;
}

export interface MarketNotificationView {
  id: string;
  kind: string;
  title: string;
  body: string;
  href: string;
  read: boolean;
  orderId?: string;
  createdAt: Date;
}

const rupees = (paise: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(paise / 100);

/**
 * Tells buyer, seller and every coordinator about an order step (not the person who took it).
 * In-app rows are written in the same transaction as the order change; web push goes out after commit.
 */
export class MarketNotifier {
  constructor(private readonly sender: PushSender | null) {}

  async notifyOrder(order: OrderDocument, status: OrderStatus, actorId: string, session: ClientSession): Promise<PendingPush[]> {
    const coordinators = await UserModel.find({ role: 'coordinator' }).session(session).exec();
    const recipients: { id: Types.ObjectId; audience: Audience }[] = [
      { id: order.buyerId, audience: 'buyer' as const },
      { id: order.sellerId, audience: 'seller' as const },
      ...coordinators.map((user) => ({ id: user._id, audience: 'coordinator' as const })),
    ].filter((recipient) => !recipient.id.equals(actorId));

    const facts = {
      ref: order.ref,
      buyerName: order.buyer.name,
      sellerName: order.seller.name,
      quantity: order.quantity,
      unit: UNIT_NAMES[order.item.unit].hi,
      product: PRODUCTS[order.item.product].hi,
      totalRupees: rupees(order.totalPaise),
      priceRupees: rupees(order.pricePerUnitPaise),
      isPriceRequest: order.isPriceRequest ?? false,
    };
    const href = `#/orders/${order._id.toString()}`;
    const rows = recipients.map(({ id, audience }) => ({ userId: id, orderId: order._id, kind: status, href, ...orderMessage(status, audience, facts) }));
    await MarketNotificationModel.insertMany(rows, { session });

    return rows.map((row) => ({
      userId: row.userId.toString(),
      payload: { title: row.title, body: row.body, url: href, tag: `order-${order._id.toString()}` },
    }));
  }

  /** Best effort: a failed push never undoes an order step (the in-app notification is already saved). */
  async sendPush(pending: PendingPush[]): Promise<void> {
    if (!this.sender || pending.length === 0) return;
    const sender = this.sender;
    await Promise.all(
      pending.map(async ({ userId, payload }) => {
        try {
          const subscriptions = await PushSubscriptionModel.find({ userId }).lean().exec();
          for (const row of subscriptions) {
            const result = await sender.send({ endpoint: row.endpoint, keys: { p256dh: row.keys.p256dh, auth: row.keys.auth } }, payload);
            if (result === 'gone') await PushSubscriptionModel.deleteOne({ endpoint: row.endpoint }).exec();
          }
        } catch (error) {
          console.error('Market push failed:', error instanceof Error ? error.message : error);
        }
      }),
    );
  }
}

export async function listNotifications(userId: string): Promise<{ items: MarketNotificationView[]; unreadCount: number }> {
  const [rows, unreadCount] = await Promise.all([
    MarketNotificationModel.find({ userId }).sort({ createdAt: -1 }).limit(NOTIFICATION_RULES.listLimit).lean().exec(),
    MarketNotificationModel.countDocuments({ userId, read: false }).exec(),
  ]);
  return {
    unreadCount,
    items: rows.map((row) => ({
      id: row._id.toString(),
      kind: row.kind,
      title: row.title,
      body: row.body,
      href: row.href,
      read: row.read,
      ...(row.orderId && { orderId: row.orderId.toString() }),
      createdAt: row.createdAt,
    })),
  };
}

/** Marks the given notifications (or all) of this user as read. Other users' rows are never touched. */
export async function markRead(userId: string, ids: string[] | undefined): Promise<void> {
  await MarketNotificationModel.updateMany({ userId, ...(ids && { _id: { $in: ids } }) }, { $set: { read: true } }).exec();
}
