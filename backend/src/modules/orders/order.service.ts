import { randomInt } from 'node:crypto';
import mongoose, { isValidObjectId, mongo, type ClientSession } from 'mongoose';
import { ORDER_RULES } from '../../config/marketRules.js';
import { AppError } from '../../errors/AppError.js';
import { toPlace } from '../auth/accountView.js';
import type { AuthUser } from '../auth/auth.types.js';
import { UserModel } from '../auth/user.model.js';
import { recordCommission } from '../commission/commission.service.js';
import { ListingModel } from '../listings/listing.model.js';
import { isPubliclyVisible, photoUrl } from '../listings/listing.service.js';
import type { MarketNotifier, PendingPush } from '../notifications/notifier.js';
import { OrderModel, type OrderDocument, type PaymentMethod } from './order.model.js';
import type { CreateOrderBody, OrderView } from './order.types.js';
import {
  allowedNextStatuses,
  CONTACT_VISIBLE_STATUSES,
  findTransition,
  PAYMENT_VISIBLE_STATUSES,
  type OrderActor,
  type OrderStatus,
  type TransitionRule,
} from './orderStateMachine.js';
import { upiPayLink } from './upi.js';
import { track } from '../metrics/events.js';

export interface OrderServiceDeps {
  notifier: MarketNotifier;
  /** Commission rate in basis points (from config / env). */
  commissionBps: number;
  now?: () => Date;
}

/** Letters and digits that cannot be confused when read out on the phone (no 0/O, 1/I/L). */
const REF_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

function newRef(): string {
  return `AG${Array.from({ length: 6 }, () => REF_ALPHABET[randomInt(REF_ALPHABET.length)]).join('')}`;
}

export class OrderService {
  private readonly now: () => Date;

  constructor(private readonly deps: OrderServiceDeps) {
    this.now = deps.now ?? (() => new Date());
  }

  /**
   * A buyer orders from a visible listing. No stock is taken yet: that happens atomically when the seller
   * accepts. With `offeredPricePerUnitPaise` it is a B2B price request (only on bulk listings).
   */
  async placeOrder(buyer: AuthUser, body: CreateOrderBody): Promise<OrderDocument> {
    const [listing, buyerDoc] = await Promise.all([ListingModel.findById(body.listingId).exec(), UserModel.findById(buyer.id).exec()]);
    if (!listing || !isPubliclyVisible(listing)) throw new AppError('NOT_FOUND', 'Listing not available');
    if (!buyerDoc) throw new AppError('UNAUTHORIZED');
    if (body.quantity < listing.minOrderQty) throw new AppError('INVALID_INPUT', 'Below the minimum order quantity');
    if (body.quantity > listing.quantityAvailable) throw new AppError('OUT_OF_STOCK');

    const offer = body.offeredPricePerUnitPaise;
    if (offer !== undefined) {
      const tooLow = offer < Math.ceil(listing.pricePerUnitPaise * ORDER_RULES.minOfferShare);
      if (listing.minOrderQty <= 1 || offer >= listing.pricePerUnitPaise || tooLow) {
        throw new AppError('INVALID_INPUT', 'Price requests are for bulk listings, below the listed price');
      }
    }
    if (body.referral && listing.category !== 'input') throw new AppError('INVALID_INPUT', 'Referral only for farm inputs');
    const seller = await UserModel.findById(listing.sellerId).exec();
    if (!seller) throw new AppError('NOT_FOUND');

    const pricePerUnitPaise = offer ?? listing.pricePerUnitPaise;
    let pending: PendingPush[] = [];
    const order = await this.withUniqueRef((ref) =>
      mongoose.connection.transaction(async (session) => {
        const [created] = await OrderModel.create(
          [
            {
              ref,
              listingId: listing._id,
              sellerId: listing.sellerId,
              buyerId: buyerDoc._id,
              item: {
                product: listing.product,
                title: { hi: listing.title.hi, en: listing.title.en },
                unit: listing.unit,
                ...(listing.photoIds[0] && { photoUrl: photoUrl(listing.photoIds[0]) }),
              },
              buyer: { name: buyerDoc.name, village: buyerDoc.buyer?.village },
              seller: { name: seller.name, village: seller.seller?.village },
              quantity: body.quantity,
              listedPricePerUnitPaise: listing.pricePerUnitPaise,
              pricePerUnitPaise,
              totalPaise: body.quantity * pricePerUnitPaise,
              isPriceRequest: offer !== undefined,
              ...(body.referral && { referral: body.referral }),
              fulfilment: body.fulfilment,
              ...(body.fulfilment === 'delivery' && { deliveryAddress: body.deliveryAddress }),
              paymentMethod: body.paymentMethod,
              ...(body.note && { note: body.note }),
              status: 'requested',
              history: [{ status: 'requested', at: this.now(), byUserId: buyerDoc._id, byRole: 'buyer' }],
            },
          ],
          { session },
        );
        if (!created) throw new AppError('INTERNAL', 'Order was not created');
        pending = await this.deps.notifier.notifyOrder(created, 'requested', buyer.id, session);
        return created;
      }),
    );
    await this.deps.notifier.sendPush(pending);
    if (order.referral) track('ai_kit_order');
    return order;
  }

  /**
   * Moves an order one step, if the state machine allows it for this person. The status change and its effect
   * (stock, commission, notifications) happen in one transaction: all or nothing. If someone else changed the
   * order first, this fails with INVALID_TRANSITION instead of overwriting.
   */
  async transition(actor: AuthUser, orderId: string, to: OrderStatus, paidVia?: PaymentMethod): Promise<OrderDocument> {
    const order = await this.findForViewer(actor, orderId);
    const role = actorRole(actor, order);
    const rule = findTransition(order.status, to, role, order.fulfilment);
    if (!rule) throw new AppError('INVALID_TRANSITION');

    let pending: PendingPush[] = [];
    const updated = await mongoose.connection.transaction(async (session) => {
      const now = this.now();
      const changed = await OrderModel.findOneAndUpdate(
        { _id: order._id, status: order.status },
        {
          $set: { status: to, ...(to === 'paid' && { paidVia: paidVia ?? order.paymentMethod }) },
          $push: { history: { status: to, at: now, byUserId: actor.id, byRole: actor.role } },
        },
        { session, returnDocument: 'after' },
      ).exec();
      if (!changed) throw new AppError('INVALID_TRANSITION', 'Order changed meanwhile');

      await this.applyEffect(rule, changed, now, session);
      pending = await this.deps.notifier.notifyOrder(changed, to, actor.id, session);
      return changed;
    });
    await this.deps.notifier.sendPush(pending);
    return updated;
  }

  private async applyEffect(rule: TransitionRule, order: OrderDocument, now: Date, session: ClientSession): Promise<void> {
    switch (rule.effect) {
      case 'reserveStock': {
        // Atomic check-and-take: two accepts racing for the last bags cannot both succeed.
        const listing = await ListingModel.findOneAndUpdate(
          { _id: order.listingId, quantityAvailable: { $gte: order.quantity } },
          { $inc: { quantityAvailable: -order.quantity } },
          { session, returnDocument: 'after' },
        ).exec();
        if (!listing) throw new AppError('OUT_OF_STOCK');
        if (listing.quantityAvailable === 0) await ListingModel.updateOne({ _id: listing._id }, { $set: { status: 'sold_out' } }, { session }).exec();
        return;
      }
      case 'releaseStock': {
        const listing = await ListingModel.findOneAndUpdate(
          { _id: order.listingId },
          { $inc: { quantityAvailable: order.quantity } },
          { session, returnDocument: 'after' },
        ).exec();
        // Sold out only because of this order: back on sale.
        if (listing?.status === 'sold_out' && listing.quantityAvailable > 0) {
          await ListingModel.updateOne({ _id: listing._id }, { $set: { status: 'active' } }, { session }).exec();
        }
        return;
      }
      case 'recordCommission': {
        const amount = await recordCommission(order, this.deps.commissionBps, now, session);
        await OrderModel.updateOne({ _id: order._id }, { $set: { commissionPaise: amount } }, { session }).exec();
        order.commissionPaise = amount;
        return;
      }
      case undefined:
        return;
    }
  }

  /** Buyer's 1–5 stars after completion, once. Updates the seller's average in the same transaction. */
  async rate(actor: AuthUser, orderId: string, rating: { stars: number; comment?: string }): Promise<OrderDocument> {
    const order = await this.findForViewer(actor, orderId);
    if (actorRole(actor, order) !== 'buyer') throw new AppError('FORBIDDEN');

    return mongoose.connection.transaction(async (session) => {
      const rated = await OrderModel.findOneAndUpdate(
        { _id: order._id, status: 'completed', rating: { $exists: false } },
        { $set: { rating: { ...rating, at: this.now() } } },
        { session, returnDocument: 'after' },
      ).exec();
      if (!rated) throw new AppError('CONFLICT', 'Not completed or already rated');
      await UserModel.updateOne(
        { _id: order.sellerId },
        { $inc: { 'seller.ratingSum': rating.stars, 'seller.ratingCount': 1 } },
        { session },
      ).exec();
      return rated;
    });
  }

  /** Coordinator arranges delivery: who brings it (name + phone, shown to buyer and seller). */
  async assignDeliveryPerson(orderId: string, person: { name: string; phone: string }): Promise<OrderDocument> {
    const order = isValidObjectId(orderId)
      ? await OrderModel.findByIdAndUpdate(orderId, { $set: { deliveryPerson: person } }, { returnDocument: 'after' }).exec()
      : null;
    if (!order) throw new AppError('NOT_FOUND');
    return order;
  }

  /** Buyer: own orders; seller: orders received; coordinator: any. Others get NOT_FOUND (no hint it exists). */
  async findForViewer(actor: AuthUser, orderId: string): Promise<OrderDocument> {
    const order = isValidObjectId(orderId) ? await OrderModel.findById(orderId).exec() : null;
    if (!order) throw new AppError('NOT_FOUND');
    if (actor.role === 'coordinator' || order.buyerId.equals(actor.id) || order.sellerId.equals(actor.id)) return order;
    throw new AppError('NOT_FOUND');
  }

  async listMine(actor: AuthUser, status: OrderStatus | undefined, page: number): Promise<{ items: OrderDocument[]; hasMore: boolean }> {
    const pageSize = 20;
    const owner = actor.role === 'seller' ? { sellerId: actor.id } : actor.role === 'buyer' ? { buyerId: actor.id } : {};
    const rows = await OrderModel.find({ ...owner, ...(status && { status }) })
      .sort({ updatedAt: -1, _id: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize + 1)
      .exec();
    return { items: rows.slice(0, pageSize), hasMore: rows.length > pageSize };
  }

  private async withUniqueRef<T>(create: (ref: string) => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await create(newRef());
      } catch (error) {
        const duplicateRef = error instanceof mongo.MongoServerError && error.code === 11000 && attempt < 3;
        if (!duplicateRef) throw error;
      }
    }
  }
}

function actorRole(actor: AuthUser, order: OrderDocument): OrderActor {
  if (actor.role === 'coordinator') return 'coordinator';
  return order.sellerId.equals(actor.id) ? 'seller' : 'buyer';
}

/** The order as `viewer` may see it: phones only after acceptance, UPI details only for the buyer. */
export async function toOrderView(order: OrderDocument, viewer: AuthUser): Promise<OrderView> {
  const viewerRole = actorRole(viewer, order);
  const contactVisible = CONTACT_VISIBLE_STATUSES.includes(order.status) || viewerRole === 'coordinator';
  const needsSeller = contactVisible || (viewerRole === 'buyer' && PAYMENT_VISIBLE_STATUSES.includes(order.status));
  const [seller, buyer] = await Promise.all([
    needsSeller ? UserModel.findById(order.sellerId).exec() : null,
    contactVisible ? UserModel.findById(order.buyerId).exec() : null,
  ]);

  const showPayment = viewerRole === 'buyer' && PAYMENT_VISIBLE_STATUSES.includes(order.status) && seller?.seller?.upiId;
  return {
    id: order._id.toString(),
    ref: order.ref,
    status: order.status,
    item: {
      listingId: order.listingId.toString(),
      product: order.item.product,
      title: { hi: order.item.title.hi, en: order.item.title.en },
      unit: order.item.unit,
      ...(order.item.photoUrl && { photoUrl: order.item.photoUrl }),
    },
    quantity: order.quantity,
    listedPricePerUnitPaise: order.listedPricePerUnitPaise,
    pricePerUnitPaise: order.pricePerUnitPaise,
    totalPaise: order.totalPaise,
    isPriceRequest: order.isPriceRequest ?? false,
    ...(order.referral && { referral: order.referral }),
    fulfilment: order.fulfilment,
    ...(order.deliveryAddress && { deliveryAddress: order.deliveryAddress }),
    paymentMethod: order.paymentMethod,
    ...(order.paidVia && { paidVia: order.paidVia }),
    ...(order.note && { note: order.note }),
    buyer: { name: order.buyer.name, ...(order.buyer.village && { village: order.buyer.village }) },
    seller: { name: order.seller.name, ...(order.seller.village && { village: order.seller.village }) },
    history: order.history.map((entry) => ({ status: entry.status, at: entry.at, byRole: entry.byRole })),
    ...(order.deliveryPerson?.name &&
      order.deliveryPerson.phone && { deliveryPerson: { name: order.deliveryPerson.name, phone: order.deliveryPerson.phone } }),
    ...(order.rating && { rating: { stars: order.rating.stars, ...(order.rating.comment && { comment: order.rating.comment }) } }),
    ...(viewerRole !== 'buyer' && order.commissionPaise !== undefined && order.commissionPaise !== null && { commissionPaise: order.commissionPaise }),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    viewerRole,
    allowedNext: allowedNextStatuses(order.status, viewerRole, order.fulfilment),
    ...(contactVisible && {
      contact: {
        ...(viewerRole !== 'seller' && seller && { sellerPhone: seller.phone }),
        ...(viewerRole !== 'buyer' && buyer && { buyerPhone: buyer.phone }),
        ...(order.fulfilment === 'pickup' && seller?.seller?.pickup && { pickup: toPlace(seller.seller.pickup) }),
      },
    }),
    ...(showPayment &&
      seller?.seller?.upiId && {
        payment: {
          upiId: seller.seller.upiId,
          payeeName: seller.name,
          amountPaise: order.totalPaise,
          upiLink: upiPayLink({ upiId: seller.seller.upiId, payeeName: seller.name, amountPaise: order.totalPaise, orderRef: order.ref }),
        },
      }),
    canRate: viewerRole === 'buyer' && order.status === 'completed' && !order.rating,
  };
}
