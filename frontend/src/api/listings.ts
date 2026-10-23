import { getJson, isRecord, requestApi, sendJson } from './client';
import type { DraftResponse, ListingChange, NewListing, SellerListing } from './marketTypes';

/** Snap & List: photo + what the seller said → a filled-in form (or "take another photo"). */
export function draftListing(photo: Blob, text: string): Promise<DraftResponse> {
  const form = new FormData();
  form.append('text', text);
  form.append('image', photo, 'product.jpg');
  return requestApi('/api/market/listings/draft', { method: 'POST', body: form }, isDraftResponse);
}

/** Used when the AI could not help: the photo is uploaded on its own and the seller fills the form. */
export async function uploadListingPhoto(photo: Blob): Promise<string> {
  const form = new FormData();
  form.append('image', photo, 'product.jpg');
  return (await requestApi('/api/market/photos', { method: 'POST', body: form }, isPhotoResponse)).photoId;
}

export async function createListing(listing: NewListing): Promise<SellerListing> {
  return (await sendJson('POST', '/api/market/listings', listing, isListingResponse)).listing;
}

export async function updateListing(id: string, change: ListingChange): Promise<SellerListing> {
  return (await sendJson('PATCH', `/api/market/listings/${encodeURIComponent(id)}`, change, isListingResponse)).listing;
}

export async function fetchMyListings(): Promise<SellerListing[]> {
  return (await getJson('/api/market/my/listings', isListingList)).items;
}

function isDraftResponse(body: unknown): body is DraftResponse {
  if (!isRecord(body)) return false;
  if (body.status === 'retake') return typeof body.reason === 'string';
  return body.status === 'ok' && typeof body.photoId === 'string' && isRecord(body.draft);
}

function isPhotoResponse(body: unknown): body is { photoId: string } {
  return isRecord(body) && typeof body.photoId === 'string';
}

export function isSellerListing(value: unknown): value is SellerListing {
  return isRecord(value) && typeof value.id === 'string' && typeof value.pricePerUnitPaise === 'number';
}

function isListingResponse(body: unknown): body is { listing: SellerListing } {
  return isRecord(body) && isSellerListing(body.listing);
}

function isListingList(body: unknown): body is { items: SellerListing[] } {
  return isRecord(body) && Array.isArray(body.items) && body.items.every(isSellerListing);
}
