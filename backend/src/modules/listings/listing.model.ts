import { model, Schema } from 'mongoose';
import { CATEGORIES, PRODUCT_IDS, UNITS } from '../../config/marketCatalog.js';
import { STORAGE_PROVIDERS } from '../../services/storage/photoStorage.js';
import { LISTING_STATUSES } from './listing.types.js';

const bilingualSchema = new Schema({ hi: { type: String, default: '' }, en: { type: String, default: '' } }, { _id: false });

const listingSchema = new Schema(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    /** Copy of the seller's status, so the public search needs no join. Updated when a coordinator decides. */
    sellerVerified: { type: Boolean, required: true, default: false },
    category: { type: String, enum: CATEGORIES, required: true },
    product: { type: String, enum: PRODUCT_IDS, required: true },
    title: { type: bilingualSchema, required: true },
    description: { type: bilingualSchema, default: () => ({}) },
    qualityNotes: { type: String, default: '' },
    unit: { type: String, enum: UNITS, required: true },
    /** Integer paise per unit. */
    pricePerUnitPaise: { type: Number, required: true, min: 0 },
    /** Whole units still for sale. Reserved atomically when an order is accepted. */
    quantityAvailable: { type: Number, required: true, min: 0 },
    minOrderQty: { type: Number, required: true, min: 1, default: 1 },
    photoIds: [{ type: Schema.Types.ObjectId, ref: 'ListingPhoto' }],
    fssaiNumber: String,
    /** Seller's pickup place: GeoJSON point for "पास में" search, plus names to show. */
    location: {
      type: { type: String, enum: ['Point'], required: true, default: 'Point' },
      coordinates: { type: [Number], required: true },
    },
    place: { district: String, tehsil: String },
    status: { type: String, enum: LISTING_STATUSES, required: true, default: 'active' },
    /** Hidden by a coordinator, e.g. after a buyer report. */
    hidden: { type: Boolean, default: false },
    hiddenReason: String,
    /** Listing created by a coordinator for a seller who cannot use the app, with the seller's consent. */
    assisted: {
      type: new Schema(
        {
          coordinatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
          consentMethod: { type: String, required: true },
          consentNote: String,
          recordedAt: { type: Date, required: true },
        },
        { _id: false },
      ),
    },
    demo: Boolean,
  },
  { timestamps: true, versionKey: false },
);

listingSchema.index({ location: '2dsphere' });
listingSchema.index({ status: 1, hidden: 1, sellerVerified: 1, category: 1, product: 1, createdAt: -1 });
// "मेरी बिक्री" (newest first) and the platform price suggestion for one product + unit.
listingSchema.index({ sellerId: 1, createdAt: -1 });
listingSchema.index({ product: 1, unit: 1, createdAt: -1 });

export const ListingModel = model('Listing', listingSchema, 'listings');
export type ListingDocument = InstanceType<typeof ListingModel>;

/**
 * Listing photos (already shrunk and stripped of GPS data on the phone), stored in MongoDB so no paid file
 * storage is needed. Uploaded photos that never became part of a listing are deleted automatically.
 */
const listingPhotoSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    /** The bytes, when STORAGE_PROVIDER=database (and for every photo saved before Phase 4). */
    data: Buffer,
    /** Key of the file at the storage provider (Cloudinary public_id), when not in the database. */
    storageKey: String,
    storage: { type: String, enum: STORAGE_PROVIDERS, default: 'database' },
    mimeType: { type: String, required: true },
    attached: { type: Boolean, required: true, default: false },
    listingId: { type: Schema.Types.ObjectId, ref: 'Listing' },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);

// Unused uploads are removed by jobs/photoCleanup.ts (not a TTL index: a file at Cloudinary must go too).
listingPhotoSchema.index({ attached: 1, createdAt: 1 });
listingPhotoSchema.index({ listingId: 1 });

export const ListingPhotoModel = model('ListingPhoto', listingPhotoSchema, 'listing_photos');
export type ListingPhotoDocument = InstanceType<typeof ListingPhotoModel>;
