import { isValidObjectId, Types } from 'mongoose';
import { productInfo, PRODUCTS, UNIT_NAMES, type Unit } from '../../config/marketCatalog.js';
import { LISTING_RULES, PRICING_RULES } from '../../config/marketRules.js';
import { AppError } from '../../errors/AppError.js';
import type { AiProvider } from '../../services/ai/aiProvider.js';
import { redactPersonalData } from '../../services/ai/marketPrompt.js';
import type { ImageMimeType } from '../../types/diagnosis.js';
import type { PhotoContent, PhotoSize, PhotoStorage } from '../../services/storage/photoStorage.js';
import { logger } from '../../observability/logger.js';
import { isSellerProfileComplete } from '../auth/accountView.js';
import type { AuthUser } from '../auth/auth.types.js';
import { UserModel } from '../auth/user.model.js';
import { ListingModel, ListingPhotoModel, type ListingDocument, type ListingPhotoDocument } from './listing.model.js';
import type {
  AiListingDraft,
  CreateListingBody,
  DraftResponse,
  ListingDraft,
  SellerListingView,
  UpdateListingBody,
} from './listing.types.js';

export interface UploadedPhoto {
  buffer: Buffer;
  mimeType: ImageMimeType;
}

export interface AssistedConsent {
  coordinatorId: string;
  method: string;
  note?: string;
}

/**
 * "Snap & List": the AI reads the photo and the seller's words. A photo that does not show the product is
 * not stored; the seller is asked for another one. A good photo is stored and its id comes back with the draft.
 */
export async function draftListing(
  ai: AiProvider,
  storage: PhotoStorage,
  user: AuthUser,
  photo: UploadedPhoto,
  sellerText: string,
): Promise<DraftResponse> {
  const result = await ai.draftListing({ image: photo.buffer, mimeType: photo.mimeType, sellerText: redactPersonalData(sellerText) });
  if (!result.photo_matches_product) {
    return { status: 'retake', reason: result.photo_problem, draft: toDraft(result) };
  }
  const photoId = await storePhoto(storage, user.id, photo);
  return { status: 'ok', photoId, draft: toDraft(result) };
}

/** Stores a photo for a listing that is not saved yet: the file at the provider, its record in MongoDB. */
export async function storePhoto(storage: PhotoStorage, ownerId: string, photo: UploadedPhoto): Promise<string> {
  const ref = await storage.save(photo);
  try {
    const saved = await ListingPhotoModel.create({ ownerId, ...ref, storage: storage.name, mimeType: photo.mimeType });
    return saved._id.toString();
  } catch (error) {
    // No record means nobody could ever use or clean up the file: remove it again.
    if ('storageKey' in ref) await storage.remove(ref.storageKey).catch((removeError: unknown) => logger.error({ err: removeError }, 'orphan photo not removed'));
    throw error;
  }
}

/** What GET /api/market/photos/:id sends: bytes kept in MongoDB, or a redirect to the provider's CDN. */
export async function photoContent(photo: ListingPhotoDocument, storage: PhotoStorage, size: PhotoSize = 'full'): Promise<PhotoContent | null> {
  // Database photos are already small (≤1024 px from the phone): the same bytes for both sizes.
  if (photo.data) return { kind: 'bytes', data: photo.data, mimeType: photo.mimeType };
  return photo.storageKey ? storage.open(photo.storageKey, size) : null;
}

/** Cleans up what the AI said into whole units, paise, and a unit the product allows. */
export function toDraft(ai: AiListingDraft): ListingDraft {
  const product = productInfo(ai.product);
  let unit: Unit | null = ai.unit && product.units.includes(ai.unit) ? ai.unit : null;
  let quantity = ai.quantity;
  let rupees = unit ? ai.price_per_unit_rupees : null; // a price without a known unit is meaningless

  // "ढाई क्विंटल" = 2.5 quintal: quantities are whole numbers, so this becomes 250 kg (and the price per kg).
  if (quantity !== null && !Number.isInteger(quantity)) {
    if (unit === 'quintal' && product.units.includes('kg')) {
      quantity = Math.round(quantity * PRICING_RULES.kgPerQuintal);
      unit = 'kg';
      rupees = rupees === null ? null : rupees / PRICING_RULES.kgPerQuintal;
    } else {
      quantity = Math.round(quantity);
    }
  }
  if (quantity !== null && (quantity < 1 || quantity > LISTING_RULES.maxQuantity)) quantity = null;

  const paise = rupees === null ? 0 : Math.round(rupees * 100);
  const pricePerUnitPaise = paise > 0 ? Math.min(paise, LISTING_RULES.maxPricePerUnitPaise) : null;

  return {
    category: product.category,
    product: ai.product,
    quantity,
    unit,
    pricePerUnitPaise,
    qualityNotes: ai.quality_notes,
    title: {
      hi: ai.title_hi || fallbackTitle(ai.product, quantity, unit, 'hi'),
      en: ai.title_en || fallbackTitle(ai.product, quantity, unit, 'en'),
    },
    description: { hi: ai.description_hi, en: ai.description_en },
  };
}

function fallbackTitle(product: keyof typeof PRODUCTS, quantity: number | null, unit: Unit | null, lang: 'hi' | 'en'): string {
  const name = PRODUCTS[product][lang];
  return quantity && unit ? `${name} – ${quantity} ${UNIT_NAMES[unit][lang]}` : name;
}

/**
 * Creates a listing for `sellerId`. Pending sellers may list (so nothing is lost), but their listings stay
 * hidden until a coordinator verifies them. Photos must be the uploader's own, not yet used and not expired.
 */
export async function createListing(
  sellerId: string,
  body: CreateListingBody,
  options: { uploaderId: string; assisted?: AssistedConsent },
): Promise<ListingDocument> {
  const seller = isValidObjectId(sellerId) ? await UserModel.findById(sellerId).exec() : null;
  if (!seller || seller.role !== 'seller' || !seller.seller) throw new AppError('NOT_FOUND', 'Seller not found');
  const pickup = seller.seller.pickup;
  if (!isSellerProfileComplete(seller.seller) || !pickup) throw new AppError('SELLER_PROFILE_MISSING');

  const product = productInfo(body.product);
  if (product.category !== body.category || !product.units.includes(body.unit)) {
    throw new AppError('INVALID_INPUT', 'Product, category and unit do not match');
  }
  if (body.minOrderQty > body.quantity) throw new AppError('INVALID_INPUT', 'Minimum order is more than the quantity');

  const listingId = new Types.ObjectId();
  const photoIds = [...new Set(body.photoIds)].map((id) => new Types.ObjectId(id));

  // No transaction needed (works on any MongoDB): claim the photos atomically, then save the listing.
  // If either step fails, exactly the photos claimed for this listing are released again.
  if (photoIds.length > 0) {
    const claimed = await ListingPhotoModel.updateMany(
      { _id: { $in: photoIds }, ownerId: options.uploaderId, attached: false },
      { $set: { attached: true, listingId } },
    ).exec();
    if (claimed.modifiedCount !== photoIds.length) {
      await releasePhotos(listingId);
      throw new AppError('INVALID_INPUT', 'Photo missing, expired or not yours');
    }
  }

  try {
    return await ListingModel.create({
      _id: listingId,
      sellerId: seller._id,
      sellerVerified: seller.seller?.status === 'verified',
      category: body.category,
      product: body.product,
      title: body.title,
      description: body.description,
      qualityNotes: body.qualityNotes,
      unit: body.unit,
      pricePerUnitPaise: body.pricePerUnitPaise,
      quantityAvailable: body.quantity,
      minOrderQty: body.minOrderQty,
      photoIds,
      ...(product.food && body.fssaiNumber && { fssaiNumber: body.fssaiNumber }),
      location: { type: 'Point', coordinates: [pickup.lon, pickup.lat] },
      place: { district: pickup.district, tehsil: pickup.tehsil },
      ...(options.assisted && {
        assisted: {
          coordinatorId: options.assisted.coordinatorId,
          consentMethod: options.assisted.method,
          consentNote: options.assisted.note,
          recordedAt: new Date(),
        },
      }),
    });
  } catch (error) {
    await releasePhotos(listingId);
    throw error;
  }
}

/** Gives photos claimed for a listing that was not saved back to their uploader (they expire later). */
async function releasePhotos(listingId: Types.ObjectId): Promise<void> {
  await ListingPhotoModel.updateMany({ listingId }, { $set: { attached: false }, $unset: { listingId: 1 } }).exec();
}

/**
 * Seller edits on "मेरी बिक्री" (price, quantity, pause, sold out). A coordinator may do the same for a
 * seller who cannot use the app. No stock left always means "sold out"; adding stock reopens the listing.
 */
export async function updateListing(actor: AuthUser, listingId: string, body: UpdateListingBody): Promise<ListingDocument> {
  const listing = await findOwnListing(actor, listingId);

  if (body.pricePerUnitPaise !== undefined) listing.pricePerUnitPaise = body.pricePerUnitPaise;
  if (body.minOrderQty !== undefined) listing.minOrderQty = body.minOrderQty;
  if (body.quantityAvailable !== undefined) {
    const restocked = listing.status === 'sold_out' && body.quantityAvailable > 0 && body.status === undefined;
    listing.quantityAvailable = body.quantityAvailable;
    if (restocked) listing.status = 'active';
  }
  if (body.status !== undefined) listing.status = body.status;
  if (listing.quantityAvailable === 0) listing.status = 'sold_out';

  await listing.save();
  return listing;
}

export async function listSellerListings(sellerId: string): Promise<ListingDocument[]> {
  return ListingModel.find({ sellerId }).sort({ createdAt: -1 }).exec();
}

/** A seller may only touch their own listings; coordinators may touch any. */
export async function findOwnListing(actor: AuthUser, listingId: string): Promise<ListingDocument> {
  const listing = isValidObjectId(listingId) ? await ListingModel.findById(listingId).exec() : null;
  if (!listing) throw new AppError('NOT_FOUND');
  if (actor.role === 'coordinator' || (actor.role === 'seller' && listing.sellerId.equals(actor.id))) return listing;
  throw new AppError('FORBIDDEN');
}

/** Photos of saved listings are public. Unused uploads are visible only to their uploader. */
export async function findPhoto(photoId: string, viewer: AuthUser | undefined) {
  const photo = isValidObjectId(photoId) ? await ListingPhotoModel.findById(photoId).exec() : null;
  if (!photo) return null;
  if (!photo.attached && photo.ownerId.toString() !== viewer?.id && viewer?.role !== 'coordinator') return null;
  return photo;
}

export function photoUrl(photoId: Types.ObjectId | string): string {
  return `/api/market/photos/${photoId.toString()}`;
}

export function isPubliclyVisible(listing: ListingDocument): boolean {
  return listing.status === 'active' && !listing.hidden && listing.sellerVerified && listing.quantityAvailable > 0;
}

export function toSellerListingView(listing: ListingDocument): SellerListingView {
  return {
    id: listing._id.toString(),
    category: listing.category,
    product: listing.product,
    title: { hi: listing.title.hi, en: listing.title.en },
    description: { hi: listing.description?.hi ?? '', en: listing.description?.en ?? '' },
    qualityNotes: listing.qualityNotes,
    unit: listing.unit,
    pricePerUnitPaise: listing.pricePerUnitPaise,
    quantityAvailable: listing.quantityAvailable,
    minOrderQty: listing.minOrderQty,
    photoUrls: listing.photoIds.map(photoUrl),
    ...(listing.fssaiNumber && { fssaiNumber: listing.fssaiNumber }),
    status: listing.status,
    hidden: listing.hidden ?? false,
    visible: isPubliclyVisible(listing),
    createdAt: listing.createdAt,
  };
}
