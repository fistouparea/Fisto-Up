import { isValidObjectId } from 'mongoose';
import { z } from 'zod';
import { CATEGORIES, PRODUCT_IDS, UNITS, type Category, type ProductId, type Unit } from '../../config/marketCatalog.js';
import { LISTING_RULES } from '../../config/marketRules.js';
import { INPUT_GENERIC_IDS, type InputGenericId } from '../../data/inputGenerics.js';

export const LISTING_STATUSES = ['active', 'paused', 'sold_out'] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const objectIdSchema = z.string().refine((value) => isValidObjectId(value), 'invalid id');

const text = (max: number) => z.string().trim().max(max);

/**
 * What the AI must return for "Snap & List". Strict: anything else is rejected (AI_ERROR) and the seller
 * fills the form by hand. Numbers are checked again and the seller confirms everything before saving.
 */
export const aiListingDraftSchema = z.object({
  photo_matches_product: z.boolean(),
  /** Simple Hindi: what to photograph instead. Empty when the photo is fine. */
  photo_problem: text(300),
  category: z.enum(CATEGORIES),
  product: z.enum(PRODUCT_IDS),
  /** May be a fraction ("ढाई क्विंटल"); converted to whole units before showing. */
  quantity: z.number().min(0).max(LISTING_RULES.maxQuantity * 100).nullable(),
  unit: z.enum(UNITS).nullable(),
  price_per_unit_rupees: z.number().min(0).max(LISTING_RULES.maxPricePerUnitPaise / 100).nullable(),
  quality_notes: text(300),
  title_hi: text(100),
  title_en: text(100),
  description_hi: text(500),
  description_en: text(500),
});
export type AiListingDraft = z.infer<typeof aiListingDraftSchema>;

/** Filled-in form suggested from the photo + the seller's words. Every field is editable on the phone. */
export interface ListingDraft {
  category: Category;
  product: ProductId;
  quantity: number | null;
  unit: Unit | null;
  pricePerUnitPaise: number | null;
  qualityNotes: string;
  title: { hi: string; en: string };
  description: { hi: string; en: string };
}

export type DraftResponse =
  | { status: 'ok'; photoId: string; draft: ListingDraft }
  /**
   * The photo does not seem to show the product: ask for another one. The draft from the seller's words comes
   * along, so the seller can still go on with this photo ("फिर भी आगे बढ़ें") without retyping.
   */
  | { status: 'retake'; reason: string; draft: ListingDraft };

export const draftBodySchema = z.object({
  /** What the seller said (speech-to-text) or typed. May be empty: then only the photo is used. */
  text: z.string().trim().max(LISTING_RULES.maxSpokenTextLength).default(''),
});

const quantitySchema = z.number().int().min(1).max(LISTING_RULES.maxQuantity);
const priceSchema = z.number().int().min(100).max(LISTING_RULES.maxPricePerUnitPaise);

export const createListingBodySchema = z.object({
  category: z.enum(CATEGORIES),
  product: z.enum(PRODUCT_IDS),
  title: z.object({ hi: text(100).min(2), en: text(100).default('') }),
  description: z.object({ hi: text(500).default(''), en: text(500).default('') }).default({ hi: '', en: '' }),
  qualityNotes: text(300).default(''),
  unit: z.enum(UNITS),
  quantity: quantitySchema,
  pricePerUnitPaise: priceSchema,
  /** Bulk (B2B) listings set a minimum order quantity above 1. */
  minOrderQty: quantitySchema.default(1),
  photoIds: z.array(objectIdSchema).max(LISTING_RULES.maxPhotos).default([]),
  /** 14-digit FSSAI registration, for SHG food products (optional). */
  fssaiNumber: z.string().trim().regex(/^\d{14}$/).optional(),
  /** खाद-बीज-दवाई only: the generic name from data/inputGenerics.ts. */
  genericId: z.enum(INPUT_GENERIC_IDS).optional(),
});
export type CreateListingBody = z.infer<typeof createListingBodySchema>;

export const updateListingBodySchema = z
  .object({
    pricePerUnitPaise: priceSchema,
    quantityAvailable: z.number().int().min(0).max(LISTING_RULES.maxQuantity),
    minOrderQty: quantitySchema,
    status: z.enum(LISTING_STATUSES),
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, 'nothing to change');
export type UpdateListingBody = z.infer<typeof updateListingBodySchema>;

export interface SellerListingView {
  id: string;
  category: Category;
  product: ProductId;
  title: { hi: string; en: string };
  description: { hi: string; en: string };
  qualityNotes: string;
  unit: Unit;
  pricePerUnitPaise: number;
  quantityAvailable: number;
  minOrderQty: number;
  photoUrls: string[];
  fssaiNumber?: string;
  genericId?: InputGenericId;
  status: ListingStatus;
  /** Hidden by a coordinator (after a report). */
  hidden: boolean;
  /** Shown to buyers: active, not hidden, seller verified, stock left. */
  visible: boolean;
  createdAt: Date;
}

export interface PublicSeller {
  id: string;
  name: string;
  village: string;
  shgName?: string;
  verified: boolean;
  rating: { average: number | null; count: number };
}

/** What buyers see. Never contains the seller's phone or UPI ID. */
export interface PublicListingView {
  id: string;
  category: Category;
  product: ProductId;
  title: { hi: string; en: string };
  description: { hi: string; en: string };
  qualityNotes: string;
  unit: Unit;
  pricePerUnitPaise: number;
  quantityAvailable: number;
  minOrderQty: number;
  photoUrls: string[];
  fssaiNumber?: string;
  genericId?: InputGenericId;
  seller: PublicSeller;
  /** A licensed input dealer's product (खाद-बीज-दवाई): shown with a "साझेदार दुकान" label. */
  partner: boolean;
  place: { district?: string; tehsil?: string };
  /** Only when the buyer gave their location. */
  distanceKm?: number;
  createdAt: Date;
}
