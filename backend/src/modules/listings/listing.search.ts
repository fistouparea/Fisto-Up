import { isValidObjectId, type QueryFilter } from 'mongoose';
import { z } from 'zod';
import { CATEGORIES, PRODUCT_IDS, PRODUCTS, type ProductId } from '../../config/marketCatalog.js';
import { LISTING_RULES } from '../../config/marketRules.js';
import { sellerRating } from '../auth/accountView.js';
import type { AuthUser } from '../auth/auth.types.js';
import { UserModel } from '../auth/user.model.js';
import { ListingModel, type ListingDocument } from './listing.model.js';
import { isPubliclyVisible, photoUrl } from './listing.service.js';
import type { PublicListingView, PublicSeller } from './listing.types.js';

const EARTH_RADIUS_KM = 6378.1;
const flag = z.enum(['true', 'false']).transform((value) => value === 'true');
const paise = z.coerce.number().int().min(0).max(LISTING_RULES.maxPricePerUnitPaise);

export const searchQuerySchema = z
  .object({
    category: z.enum(CATEGORIES).optional(),
    product: z.enum(PRODUCT_IDS).optional(),
    /** Free text (Hindi or English), matched against titles and product names. */
    q: z.string().trim().max(50).optional(),
    minPrice: paise.optional(),
    maxPrice: paise.optional(),
    /** Only listings with at least this much available. */
    minQty: z.coerce.number().int().min(1).max(LISTING_RULES.maxQuantity).optional(),
    /** B2B: only listings with a minimum order quantity (bulk). */
    bulk: flag.optional(),
    lat: z.coerce.number().min(6).max(37).optional(),
    lon: z.coerce.number().min(68).max(98).optional(),
    radiusKm: z.coerce.number().min(1).max(LISTING_RULES.maxRadiusKm).optional(),
    sort: z.enum(['newest', 'price_asc', 'price_desc']).default('newest'),
    page: z.coerce.number().int().min(1).max(500).default(1),
  })
  .refine((query) => (query.lat === undefined) === (query.lon === undefined), 'lat and lon go together');
export type SearchQuery = z.infer<typeof searchQuerySchema>;

export interface SearchPage {
  items: PublicListingView[];
  page: number;
  hasMore: boolean;
}

/** What buyers may see: active, not hidden, verified seller, stock left. */
const VISIBLE = { status: 'active', hidden: false, sellerVerified: true, quantityAvailable: { $gt: 0 } } as const;

const SORTS = {
  newest: { createdAt: -1, _id: -1 },
  price_asc: { pricePerUnitPaise: 1, _id: -1 },
  price_desc: { pricePerUnitPaise: -1, _id: -1 },
} as const;

export async function searchListings(query: SearchQuery): Promise<SearchPage> {
  const filter: QueryFilter<ListingDocument> = { ...VISIBLE };
  if (query.category) filter.category = query.category;
  if (query.product) filter.product = query.product;
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    filter.pricePerUnitPaise = {
      ...(query.minPrice !== undefined && { $gte: query.minPrice }),
      ...(query.maxPrice !== undefined && { $lte: query.maxPrice }),
    };
  }
  if (query.minQty) filter.quantityAvailable = { $gte: query.minQty };
  if (query.bulk) filter.minOrderQty = { $gt: 1 };
  if (query.lat !== undefined && query.lon !== undefined && query.radiusKm) {
    filter.location = { $geoWithin: { $centerSphere: [[query.lon, query.lat], query.radiusKm / EARTH_RADIUS_KM] } };
  }
  if (query.q) filter.$or = textConditions(query.q);

  const pageSize = LISTING_RULES.pageSize;
  const rows = await ListingModel.find(filter)
    .sort(SORTS[query.sort])
    .skip((query.page - 1) * pageSize)
    .limit(pageSize + 1)
    .exec();

  const origin = query.lat !== undefined && query.lon !== undefined ? { lat: query.lat, lon: query.lon } : undefined;
  return { items: await toPublicViews(rows.slice(0, pageSize), origin), page: query.page, hasMore: rows.length > pageSize };
}

/** Title match (escaped, never a user-built regex) or a product whose Hindi/English name matches. */
function textConditions(q: string): QueryFilter<ListingDocument>[] {
  const pattern = new RegExp(escapeRegex(q), 'i');
  const lower = q.toLowerCase();
  const products = (Object.keys(PRODUCTS) as ProductId[]).filter(
    (id) => PRODUCTS[id].hi.includes(q) || PRODUCTS[id].en.toLowerCase().includes(lower),
  );
  return [{ 'title.hi': pattern }, { 'title.en': pattern }, ...(products.length > 0 ? [{ product: { $in: products } }] : [])];
}

export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** One listing for the listing page. Hidden ones are visible only to their seller and coordinators. */
export async function findPublicListing(id: string, viewer: AuthUser | undefined): Promise<PublicListingView | null> {
  const listing = isValidObjectId(id) ? await ListingModel.findById(id).exec() : null;
  if (!listing) return null;
  const isOwner = viewer?.role === 'seller' && listing.sellerId.equals(viewer.id);
  if (!isPubliclyVisible(listing) && !isOwner && viewer?.role !== 'coordinator') return null;
  const [view] = await toPublicViews([listing]);
  return view ?? null;
}

export async function toPublicViews(listings: ListingDocument[], origin?: { lat: number; lon: number }): Promise<PublicListingView[]> {
  const sellerIds = [...new Set(listings.map((listing) => listing.sellerId.toString()))];
  const sellers = await UserModel.find({ _id: { $in: sellerIds } }, { name: 1, seller: 1 }).exec();
  const byId = new Map<string, PublicSeller>(
    sellers.map((user) => [
      user._id.toString(),
      {
        id: user._id.toString(),
        name: user.name,
        village: user.seller?.village ?? '',
        ...(user.seller?.shgName && { shgName: user.seller.shgName }),
        verified: user.seller?.status === 'verified',
        rating: sellerRating(user.seller ?? { ratingSum: 0, ratingCount: 0 }),
      },
    ]),
  );

  return listings.flatMap((listing) => {
    const seller = byId.get(listing.sellerId.toString());
    if (!seller) return [];
    const [lon, lat] = listing.location?.coordinates ?? [];
    return [
      {
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
        seller,
        place: {
          ...(listing.place?.district && { district: listing.place.district }),
          ...(listing.place?.tehsil && { tehsil: listing.place.tehsil }),
        },
        ...(origin && lat !== undefined && lon !== undefined && { distanceKm: Math.round(distanceKm(origin, { lat, lon })) }),
        createdAt: listing.createdAt,
      },
    ];
  });
}

export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}
