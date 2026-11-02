import { createHash, randomBytes } from 'node:crypto';
import { isValidObjectId } from 'mongoose';
import { DELIVERY_RULES, DELIVERY_STEPS, type DeliveryStep } from '../../config/logisticsRules.js';
import { PRODUCTS, UNIT_NAMES } from '../../config/marketCatalog.js';
import { AppError } from '../../errors/AppError.js';
import type { PhotoStorage } from '../../services/storage/photoStorage.js';
import type { ImageMimeType } from '../../types/diagnosis.js';
import { ListingPhotoModel } from '../listings/listing.model.js';
import { photoUrl, storePhoto } from '../listings/listing.service.js';
import { MarketNotificationModel } from '../notifications/notification.model.js';
import { OrderModel, type OrderDocument } from '../orders/order.model.js';

/** Order states in which a delivery can be on its way (home delivery only). */
const LINK_STATUSES = ['accepted', 'ready', 'out_for_delivery'] as const;

const STEP_TEXT: Record<DeliveryStep, { title: string; body: string }> = {
  picked: { title: 'सामान उठा लिया', body: 'डिलीवरी वाले ने सामान उठा लिया है।' },
  on_the_way: { title: 'सामान रास्ते में', body: 'सामान रास्ते में है।' },
  delivered: { title: 'सामान पहुँचा दिया', body: 'डिलीवरी वाले ने सामान पहुँचा दिया। मिलने पर ऑर्डर में "पहुँच गया" दबाएँ।' },
};

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

/** What the delivery person sees: only what is needed to deliver (no phone numbers, no prices). */
export interface DeliveryPageView {
  ref: string;
  item: string;
  quantity: string;
  buyerName: string;
  address: string;
  done: DeliveryStep[];
  next: DeliveryStep | null;
  expiresAt: Date;
}

export interface DeliveryEventView {
  step: DeliveryStep;
  at: Date;
  photoUrl?: string;
}

export class DeliveryTracking {
  constructor(private readonly now: () => Date = () => new Date()) {}

  /**
   * Coordinator: a new random link for one order with a delivery person. The token (192 bits) is returned once
   * and only its hash is kept; a new link replaces (and so ends) the old one.
   */
  async createLink(orderId: string): Promise<{ token: string; expiresAt: Date }> {
    const order = isValidObjectId(orderId) ? await OrderModel.findById(orderId).exec() : null;
    if (!order) throw new AppError('NOT_FOUND');
    if (order.fulfilment !== 'delivery' || !order.deliveryPerson?.name) throw new AppError('INVALID_INPUT', 'Home delivery with a delivery person only');
    if (!LINK_STATUSES.some((status) => status === order.status)) throw new AppError('INVALID_TRANSITION', 'Order not on its way');
    const token = randomBytes(24).toString('base64url');
    const now = this.now();
    const expiresAt = new Date(now.getTime() + DELIVERY_RULES.linkDays * 86_400_000);
    await OrderModel.updateOne({ _id: order._id }, { $set: { deliveryLink: { tokenHash: hashToken(token), expiresAt, createdAt: now } } }).exec();
    return { token, expiresAt };
  }

  /** The order of a working link; any wrong, replaced, used-up or expired token is the same NOT_FOUND. */
  async findByToken(token: string): Promise<OrderDocument> {
    if (!/^[A-Za-z0-9_-]{32}$/.test(token)) throw new AppError('NOT_FOUND');
    const order = await OrderModel.findOne({ 'deliveryLink.tokenHash': hashToken(token) }).exec();
    const link = order?.deliveryLink;
    if (!order || !link || link.closedAt || link.expiresAt <= this.now()) throw new AppError('NOT_FOUND');
    return order;
  }

  async page(token: string): Promise<DeliveryPageView> {
    const order = await this.findByToken(token);
    const done = order.deliveryEvents.map((event) => event.step);
    return {
      ref: order.ref,
      item: order.item.title.hi || PRODUCTS[order.item.product].hi,
      quantity: `${order.quantity} ${UNIT_NAMES[order.item.unit].hi}`,
      buyerName: order.buyer.name,
      address: order.deliveryAddress ?? '',
      done,
      next: nextStep(done),
      expiresAt: order.deliveryLink?.expiresAt ?? this.now(),
    };
  }

  /**
   * The delivery person's next step (only in order: picked → on the way → delivered), with an optional photo.
   * The step is added only if the order still has the same steps (two taps cannot add one twice).
   * Buyer and seller are told; after "delivered" the link stops working.
   */
  async report(token: string, step: DeliveryStep, photo: { buffer: Buffer; mimeType: ImageMimeType } | null, storage: PhotoStorage): Promise<DeliveryPageView> {
    const order = await this.findByToken(token);
    const done = order.deliveryEvents.map((event) => event.step);
    if (nextStep(done) !== step) throw new AppError('INVALID_TRANSITION');

    let photoId: string | undefined;
    if (photo) {
      photoId = await storePhoto(storage, order.sellerId.toString(), photo);
      await ListingPhotoModel.updateOne({ _id: photoId }, { $set: { attached: true, orderId: order._id } }).exec();
    }
    const now = this.now();
    const updated = await OrderModel.findOneAndUpdate(
      { _id: order._id, 'deliveryLink.tokenHash': hashToken(token), deliveryEvents: { $size: done.length } },
      {
        $push: { deliveryEvents: { step, at: now, ...(photoId && { photoId }) } },
        ...(step === 'delivered' && { $set: { 'deliveryLink.closedAt': now } }),
      },
      { returnDocument: 'after' },
    ).exec();
    if (!updated) throw new AppError('INVALID_TRANSITION', 'Changed meanwhile');

    const href = `#/orders/${order._id.toString()}`;
    await MarketNotificationModel.insertMany(
      [order.buyerId, order.sellerId].map((userId) => ({ userId, orderId: order._id, kind: 'delivery', href, title: `${STEP_TEXT[step].title} · ${order.ref}`, body: STEP_TEXT[step].body })),
    );
    return step === 'delivered' ? { ...(await this.viewOf(updated)), next: null } : this.page(token);
  }

  private async viewOf(order: OrderDocument): Promise<DeliveryPageView> {
    const done = order.deliveryEvents.map((event) => event.step);
    return {
      ref: order.ref,
      item: order.item.title.hi,
      quantity: `${order.quantity} ${UNIT_NAMES[order.item.unit].hi}`,
      buyerName: order.buyer.name,
      address: order.deliveryAddress ?? '',
      done,
      next: nextStep(done),
      expiresAt: order.deliveryLink?.expiresAt ?? this.now(),
    };
  }
}

export function nextStep(done: readonly DeliveryStep[]): DeliveryStep | null {
  return DELIVERY_STEPS[done.length] ?? null;
}

/** The timeline buyer, seller and coordinators see on the order. */
export function deliveryTimeline(order: OrderDocument): DeliveryEventView[] {
  return order.deliveryEvents.map((event) => ({ step: event.step, at: event.at, ...(event.photoId && { photoUrl: photoUrl(event.photoId) }) }));
}
