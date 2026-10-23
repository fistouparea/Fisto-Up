import { getJson, isRecord } from './client';
import type { PublicListing, SearchFilters, SearchPage } from './marketTypes';

/** Builds the query string for GET /api/market/listings. Prices are in paise. */
export function searchParams(filters: SearchFilters, page: number): URLSearchParams {
  const params = new URLSearchParams({ sort: filters.sort, page: String(page) });
  if (filters.category) params.set('category', filters.category);
  if (filters.product) params.set('product', filters.product);
  if (filters.q?.trim()) params.set('q', filters.q.trim().slice(0, 50));
  if (filters.minPrice) params.set('minPrice', String(filters.minPrice));
  if (filters.maxPrice) params.set('maxPrice', String(filters.maxPrice));
  if (filters.minQty) params.set('minQty', String(filters.minQty));
  if (filters.bulk) params.set('bulk', 'true');
  if (filters.near) {
    params.set('lat', String(filters.near.lat));
    params.set('lon', String(filters.near.lon));
    if (filters.near.radiusKm) params.set('radiusKm', String(filters.near.radiusKm));
  }
  return params;
}

export function searchListings(filters: SearchFilters, page: number): Promise<SearchPage> {
  return getJson(`/api/market/listings?${searchParams(filters, page)}`, isSearchPage);
}

export async function fetchListing(id: string): Promise<PublicListing> {
  return (await getJson(`/api/market/listings/${encodeURIComponent(id)}`, isListingResponse)).listing;
}

function isPublicListing(value: unknown): value is PublicListing {
  return isRecord(value) && typeof value.id === 'string' && isRecord(value.seller) && isRecord(value.title);
}

function isSearchPage(body: unknown): body is SearchPage {
  return isRecord(body) && Array.isArray(body.items) && body.items.every(isPublicListing) && typeof body.hasMore === 'boolean';
}

function isListingResponse(body: unknown): body is { listing: PublicListing } {
  return isRecord(body) && isPublicListing(body.listing);
}
