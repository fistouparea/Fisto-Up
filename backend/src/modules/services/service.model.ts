import { model, Schema } from 'mongoose';
import { PRICE_UNITS, SERVICE_KINDS, SERVICE_SIDES } from '../../config/serviceKinds.js';
import { ROLES } from '../auth/auth.types.js';
import { BOOKING_STATUSES } from './bookingStateMachine.js';

export const SERVICE_STATUSES = ['pending_approval', 'active', 'paused', 'rejected'] as const;
export type ServiceStatus = (typeof SERVICE_STATUSES)[number];

/** One bookable listing: a machine for rent, a worker's availability or work need, or an animal. */
const serviceListingSchema = new Schema(
  {
    kind: { type: String, enum: SERVICE_KINDS, required: true },
    side: { type: String, enum: SERVICE_SIDES, required: true, default: 'offer' },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    /** Equipment type, animal, or (labour) the main skill. */
    typeId: { type: String, required: true },
    /** Labour: every skill offered or needed. */
    skills: { type: [String], default: [] },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    /** Kind-specific facts (validated per kind in service.types.ts), e.g. breed, milk yield, workers needed. */
    details: { type: Schema.Types.Mixed, default: {} },
    photoIds: [{ type: Schema.Types.ObjectId, ref: 'ListingPhoto' }],
    village: { type: String, required: true },
    place: { district: String, tehsil: String },
    location: {
      type: { type: String, enum: ['Point'], required: true, default: 'Point' },
      coordinates: { type: [Number], required: true },
    },
    /** Integer paise per unit. */
    pricePaise: { type: Number, required: true, min: 0 },
    priceUnit: { type: String, enum: PRICE_UNITS, required: true },
    /** "YYYY-MM-DD" days the machine/worker is free (calendar kinds). Booked days are in service_day_locks. */
    availableDates: { type: [String], default: [] },
    status: { type: String, enum: SERVICE_STATUSES, required: true },
    rejectReason: String,
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    ratingSum: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    demo: Boolean,
  },
  { timestamps: true, versionKey: false },
);

serviceListingSchema.index({ location: '2dsphere' });
serviceListingSchema.index({ kind: 1, side: 1, status: 1, typeId: 1, createdAt: -1 });
serviceListingSchema.index({ ownerId: 1, createdAt: -1 });
serviceListingSchema.index({ status: 1, kind: 1, createdAt: 1 });

export const ServiceListingModel = model('ServiceListing', serviceListingSchema, 'service_listings');
export type ServiceListingDocument = InstanceType<typeof ServiceListingModel>;

/** A booking request (or, for animals, an enquiry) from one person to a listing's owner. */
const serviceBookingSchema = new Schema(
  {
    listingId: { type: Schema.Types.ObjectId, ref: 'ServiceListing', required: true },
    kind: { type: String, enum: SERVICE_KINDS, required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    requesterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    /** Copy at request time, so later edits do not change the booking. */
    title: { type: String, required: true },
    dates: { type: [String], default: [] },
    note: String,
    pricePaise: { type: Number, required: true },
    priceUnit: { type: String, enum: PRICE_UNITS, required: true },
    status: { type: String, enum: BOOKING_STATUSES, required: true, default: 'requested' },
    history: [
      {
        _id: false,
        status: { type: String, enum: BOOKING_STATUSES, required: true },
        at: { type: Date, required: true },
        byUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        byRole: { type: String, enum: ROLES, required: true },
      },
    ],
    rating: { type: new Schema({ stars: { type: Number, min: 1, max: 5, required: true }, comment: String, at: Date }, { _id: false }) },
    demo: Boolean,
  },
  { timestamps: true, versionKey: false },
);

serviceBookingSchema.index({ ownerId: 1, updatedAt: -1 });
serviceBookingSchema.index({ requesterId: 1, updatedAt: -1 });
serviceBookingSchema.index({ listingId: 1, status: 1 });

export const ServiceBookingModel = model('ServiceBooking', serviceBookingSchema, 'service_bookings');
export type ServiceBookingDocument = InstanceType<typeof ServiceBookingModel>;

/**
 * One row per booked day of a listing. The unique index makes double booking impossible: two accepts racing
 * for the same day cannot both insert it (the second one fails inside its transaction).
 */
const serviceDayLockSchema = new Schema(
  {
    listingId: { type: Schema.Types.ObjectId, ref: 'ServiceListing', required: true },
    date: { type: String, required: true },
    bookingId: { type: Schema.Types.ObjectId, ref: 'ServiceBooking', required: true },
  },
  { versionKey: false },
);
serviceDayLockSchema.index({ listingId: 1, date: 1 }, { unique: true });
serviceDayLockSchema.index({ bookingId: 1 });

export const ServiceDayLockModel = model('ServiceDayLock', serviceDayLockSchema, 'service_day_locks');
