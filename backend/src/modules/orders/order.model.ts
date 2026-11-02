import { model, Schema } from 'mongoose';
import { PRODUCT_IDS, UNITS } from '../../config/marketCatalog.js';
import { ROLES } from '../auth/auth.types.js';
import { REFERRALS } from '../../config/inputRules.js';
import { DELIVERY_STEPS } from '../../config/logisticsRules.js';
import { FULFILMENTS, ORDER_STATUSES } from './orderStateMachine.js';

export const PAYMENT_METHODS = ['upi', 'cash'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

const personSchema = new Schema({ name: { type: String, required: true }, village: String }, { _id: false });

const orderSchema = new Schema(
  {
    /** Short code people can read out on the phone, e.g. "AG7K3P9Q". Also the UPI payment reference. */
    ref: { type: String, required: true, unique: true },
    listingId: { type: Schema.Types.ObjectId, ref: 'Listing', required: true },
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    buyerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    /** Copy of the listing at order time, so later edits do not change the order. */
    item: {
      type: new Schema(
        {
          product: { type: String, enum: PRODUCT_IDS, required: true },
          title: { type: new Schema({ hi: { type: String, required: true }, en: { type: String, default: '' } }, { _id: false }), required: true },
          unit: { type: String, enum: UNITS, required: true },
          photoUrl: String,
        },
        { _id: false },
      ),
      required: true,
    },
    buyer: { type: personSchema, required: true },
    seller: { type: personSchema, required: true },
    quantity: { type: Number, required: true, min: 1 },
    /** All money in integer paise. */
    listedPricePerUnitPaise: { type: Number, required: true },
    /** The agreed price: the buyer's offer for a price request, else the listed price. */
    pricePerUnitPaise: { type: Number, required: true },
    totalPaise: { type: Number, required: true },
    /** B2B counter-offer the seller accepts or rejects. */
    isPriceRequest: { type: Boolean, default: false },
    /** Partner referral (the "ज़रूरी सामान" kit): its commission goes to the ledger as its own type. */
    referral: { type: String, enum: REFERRALS },
    fulfilment: { type: String, enum: FULFILMENTS, required: true },
    deliveryAddress: String,
    /** How the buyer plans to pay; `paidVia` is what the seller confirmed. */
    paymentMethod: { type: String, enum: PAYMENT_METHODS, required: true },
    paidVia: { type: String, enum: PAYMENT_METHODS },
    note: String,
    status: { type: String, enum: ORDER_STATUSES, required: true, default: 'requested' },
    history: [
      {
        _id: false,
        status: { type: String, enum: ORDER_STATUSES, required: true },
        at: { type: Date, required: true },
        byUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        byRole: { type: String, enum: ROLES, required: true },
      },
    ],
    /** Arranged by the SHG coordinator. */
    deliveryPerson: { type: new Schema({ name: String, phone: String }, { _id: false }) },
    /**
     * The delivery person's no-login link: only the SHA-256 of the random token is stored. A new link replaces
     * the old one; the link stops working after "delivered" (closedAt) or at expiresAt.
     */
    deliveryLink: {
      type: new Schema({ tokenHash: { type: String, required: true }, expiresAt: { type: Date, required: true }, createdAt: { type: Date, required: true }, closedAt: Date }, { _id: false }),
    },
    /** What the delivery person reported (separate from the order status, which buyer/seller confirm). */
    deliveryEvents: [
      {
        _id: false,
        step: { type: String, enum: DELIVERY_STEPS, required: true },
        at: { type: Date, required: true },
        photoId: { type: Schema.Types.ObjectId, ref: 'ListingPhoto' },
      },
    ],
    rating: {
      type: new Schema({ stars: { type: Number, min: 1, max: 5, required: true }, comment: String, at: Date }, { _id: false }),
    },
    commissionPaise: Number,
    demo: Boolean,
  },
  { timestamps: true, versionKey: false },
);

orderSchema.index({ status: 1, updatedAt: -1 });
// "मेरे ऑर्डर" for buyers and sellers, newest change first.
orderSchema.index({ buyerId: 1, updatedAt: -1 });
orderSchema.index({ sellerId: 1, updatedAt: -1 });
orderSchema.index({ 'deliveryLink.tokenHash': 1 }, { unique: true, sparse: true });

export const OrderModel = model('Order', orderSchema, 'orders');
export type OrderDocument = InstanceType<typeof OrderModel>;
