import type { QueryFilter } from 'mongoose';
import { z } from 'zod';
import { isBlockedInput, KIT_RULES } from '../../config/inputRules.js';
import { INPUT_GENERICS, matchInputGeneric, type InputGenericId } from '../../data/inputGenerics.js';
import { ListingModel, type ListingDocument } from '../listings/listing.model.js';
import { toPublicViews } from '../listings/listing.search.js';
import type { PublicListingView } from '../listings/listing.types.js';

const EARTH_RADIUS_KM = 6378.1;

/** `name` may come once or many times in the query string (?name=a&name=b). */
export const kitQuerySchema = z
  .object({
    name: z.preprocess(
      (value) => (Array.isArray(value) ? value : value === undefined ? [] : [value]),
      z.array(z.string().trim().min(1).max(KIT_RULES.maxNameLength)).min(1).max(KIT_RULES.maxItems),
    ),
    lat: z.coerce.number().min(6).max(37).optional(),
    lon: z.coerce.number().min(68).max(98).optional(),
  })
  .refine((query) => (query.lat === undefined) === (query.lon === undefined), 'lat and lon go together');
export type KitQuery = z.infer<typeof kitQuerySchema>;

export interface KitItem {
  /** The medicine/input name exactly as the diagnosis gave it. */
  name: string;
  /** The generic it matched, if any (products are matched by this, never by a brand). */
  generic: { id: InputGenericId; hi: string; en: string } | null;
  /** Verified input dealers' products, nearest first (only when the farm location is known). */
  products: PublicListingView[];
}

export interface KitResponse {
  items: KitItem[];
  /** The search radius, when the farm location was given. */
  radiusKm: number | null;
}

/**
 * "ज़रूरी सामान" after a diagnosis: the generic medicine names from the result, each with matching products of
 * verified, licensed input dealers nearby. A name on the blocklist is left out completely (never shown).
 * Only the medicine names and the farm's rounded location are used; nothing about the farmer.
 */
export async function buildKit({ name: names, lat, lon }: KitQuery): Promise<KitResponse> {
  const origin = lat !== undefined && lon !== undefined ? { lat, lon } : undefined;
  const allowed = [...new Set(names)].filter((name) => !isBlockedInput(name));
  const matched = allowed.map((name) => ({ name, genericId: matchInputGeneric(name) }));
  const genericIds = [...new Set(matched.flatMap((item) => (item.genericId ? [item.genericId] : [])))];

  const byGeneric = new Map<InputGenericId, PublicListingView[]>();
  for (const genericId of genericIds) {
    byGeneric.set(genericId, await nearbyProducts(genericId, origin));
  }

  return {
    radiusKm: origin ? KIT_RULES.radiusKm : null,
    items: matched.map(({ name, genericId }) => ({
      name,
      generic: genericId ? { id: genericId, hi: INPUT_GENERICS[genericId].hi, en: INPUT_GENERICS[genericId].en } : null,
      products: genericId ? (byGeneric.get(genericId) ?? []) : [],
    })),
  };
}

async function nearbyProducts(genericId: InputGenericId, origin: { lat: number; lon: number } | undefined): Promise<PublicListingView[]> {
  const filter: QueryFilter<ListingDocument> = {
    category: 'input',
    genericId,
    status: 'active',
    hidden: false,
    // Input dealers are verified only together with their licence check.
    sellerVerified: true,
    quantityAvailable: { $gt: 0 },
    ...(origin && { location: { $geoWithin: { $centerSphere: [[origin.lon, origin.lat], KIT_RULES.radiusKm / EARTH_RADIUS_KM] } } }),
  };
  // A few extra rows: blocked titles are dropped by toPublicViews.
  const rows = await ListingModel.find(filter).sort({ createdAt: -1 }).limit(KIT_RULES.productsPerItem * 4).lean().exec();
  const views = await toPublicViews(rows, origin);
  // Nearest first; without a location the newest. Never ordered by brand or by who pays us more.
  const sorted = origin ? views.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0) || a.pricePerUnitPaise - b.pricePerUnitPaise) : views;
  return sorted.slice(0, KIT_RULES.productsPerItem);
}
