import { model, Schema } from 'mongoose';
import { BUYER_TYPES, ROLES, SELLER_STATUSES } from './auth.types.js';

const placeSchema = new Schema(
  {
    district: String,
    tehsil: String,
    /** Free text: "मंडी गेट के पास", ... */
    address: String,
    lat: { type: Number, required: true },
    lon: { type: Number, required: true },
  },
  { _id: false },
);

/** Filled in by the seller (or a coordinator) after registration. Listings go public only once verified. */
const sellerSchema = new Schema(
  {
    status: { type: String, enum: SELLER_STATUSES, required: true, default: 'pending' },
    village: String,
    shgName: String,
    upiId: String,
    pickup: placeSchema,
    rejectReason: String,
    verifiedAt: Date,
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    /** Sum and count of buyer stars, so the average needs no extra query. */
    ratingSum: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
  },
  { _id: false },
);

const buyerSchema = new Schema(
  {
    buyerType: { type: String, enum: BUYER_TYPES, required: true, default: 'household' },
    businessName: String,
    village: String,
    address: String,
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    /** 10-digit Indian mobile number. Never shown publicly. */
    phone: { type: String, required: true, unique: true },
    pinHash: { type: String, required: true },
    role: { type: String, enum: ROLES, required: true },
    name: { type: String, required: true },
    /** The anonymous advisor device id (farm profile + history) linked on first login. */
    deviceId: String,
    failedLogins: { type: Number, default: 0 },
    lockedUntil: Date,
    /** Bumped on logout, which ends every session of this account. */
    tokenVersion: { type: Number, default: 0 },
    seller: sellerSchema,
    buyer: buyerSchema,
    /** Coordinator who created this account for someone who cannot use the app. */
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    /** Pilot account: signed up with an invite code or created by a coordinator. Sees "pilot" feature flags. */
    pilot: { type: Boolean, default: false },
    inviteId: { type: Schema.Types.ObjectId, ref: 'InviteCode' },
    /** Set when the person deleted their account ("मेरा डेटा"): the row stays empty for order records. */
    deletedAt: Date,
    /** Demo data from the seed script (removed and recreated on every seed run). */
    demo: Boolean,
  },
  { timestamps: true, versionKey: false },
);

userSchema.index({ role: 1, 'seller.status': 1 });

export const UserModel = model('User', userSchema, 'users');

export type UserDocument = InstanceType<typeof UserModel>;
