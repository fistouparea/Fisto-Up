import { getJson, isRecord, requestApi, sendJson } from './client';
import type { PriceUnit, ServiceKind, ServiceSide } from '../data/serviceKinds';

/** Mirrors backend/src/modules/services/service.types.ts. Money is integer paise. Never phone numbers in listings. */
export type ServiceStatus = 'pending_approval' | 'active' | 'paused' | 'rejected';
export type BookingStatus = 'requested' | 'accepted' | 'rejected' | 'cancelled' | 'completed';
export type BookingActor = 'owner' | 'requester' | 'coordinator';

export interface ServiceListing {
  id: string;
  kind: ServiceKind;
  side: ServiceSide;
  typeId: string;
  skills: string[];
  title: string;
  description: string;
  details: Record<string, unknown>;
  photoUrls: string[];
  village: string;
  place: { district?: string; tehsil?: string };
  pricePaise: number;
  priceUnit: PriceUnit;
  freeDates: string[];
  owner: { id: string; name: string; rating: { average: number | null; count: number } };
  distanceKm?: number;
  rating: { average: number | null; count: number };
  createdAt: string;
  /** Only in the owner's (or coordinator's) view. */
  status?: ServiceStatus;
  rejectReason?: string;
  bookedDates?: string[];
}

export interface Booking {
  id: string;
  listingId: string;
  kind: ServiceKind;
  title: string;
  dates: string[];
  note?: string;
  pricePaise: number;
  priceUnit: PriceUnit;
  status: BookingStatus;
  history: { status: BookingStatus; at: string; byRole: string }[];
  owner: { name: string };
  requester: { name: string };
  viewerRole: BookingActor;
  allowedNext: BookingStatus[];
  contact?: { ownerPhone?: string; requesterPhone?: string };
  rating?: { stars: number; comment?: string };
  canRate: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LabourMatch {
  listing: ServiceListing;
  score: number;
  sharedSkills: string[];
  sharedDates: string[];
}

export interface NewService {
  kind: ServiceKind;
  side: ServiceSide;
  typeId?: string;
  skills?: string[];
  title: string;
  description: string;
  photoIds: string[];
  village: string;
  place: { district?: string; tehsil?: string; lat: number; lon: number };
  pricePaise: number;
  priceUnit: PriceUnit;
  availableDates: string[];
  details: Record<string, unknown>;
}

export interface ServiceSearchQuery {
  kind: ServiceKind;
  side?: ServiceSide;
  typeId?: string;
  skill?: string;
  date?: string;
  lat?: number;
  lon?: number;
}

const isListing = (value: unknown): value is ServiceListing => isRecord(value) && typeof value.id === 'string' && typeof value.kind === 'string';
const isBooking = (value: unknown): value is Booking => isRecord(value) && typeof value.id === 'string' && typeof value.status === 'string' && Array.isArray(value.allowedNext);
const hasListing = (value: unknown): value is { listing: ServiceListing } => isRecord(value) && isListing(value.listing);
const hasBooking = (value: unknown): value is { booking: Booking } => isRecord(value) && isBooking(value.booking);
const listingItems = (value: unknown): value is { items: ServiceListing[]; hasMore?: boolean } => isRecord(value) && Array.isArray(value.items) && value.items.every(isListing);
const bookingItems = (value: unknown): value is { items: Booking[] } => isRecord(value) && Array.isArray(value.items) && value.items.every(isBooking);
const matchItems = (value: unknown): value is { items: LabourMatch[] } => isRecord(value) && Array.isArray(value.items);

export async function searchServices(query: ServiceSearchQuery): Promise<ServiceListing[]> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (value !== undefined) params.set(key, String(value));
  return (await getJson(`/api/services?${params}`, listingItems)).items;
}

export async function fetchService(id: string): Promise<ServiceListing> {
  return (await getJson(`/api/services/item/${encodeURIComponent(id)}`, hasListing)).listing;
}

export async function fetchMyServices(): Promise<ServiceListing[]> {
  return (await getJson('/api/services/my', listingItems)).items;
}

export async function uploadServicePhoto(photo: Blob): Promise<string> {
  const form = new FormData();
  form.append('image', photo, 'service.jpg');
  return (await requestApi('/api/services/photos', { method: 'POST', body: form }, (value): value is { photoId: string } => isRecord(value) && typeof value.photoId === 'string')).photoId;
}

export async function createService(service: NewService): Promise<ServiceListing> {
  return (await sendJson('POST', '/api/services', service, hasListing)).listing;
}

export async function updateService(id: string, change: { pricePaise?: number; availableDates?: string[]; status?: 'active' | 'paused' }): Promise<ServiceListing> {
  return (await sendJson('PATCH', `/api/services/item/${encodeURIComponent(id)}`, change, hasListing)).listing;
}

export async function fetchMatches(id: string): Promise<LabourMatch[]> {
  return (await getJson(`/api/services/item/${encodeURIComponent(id)}/matches`, matchItems)).items;
}

export async function requestBooking(id: string, body: { dates: string[]; note?: string }): Promise<Booking> {
  return (await sendJson('POST', `/api/services/item/${encodeURIComponent(id)}/bookings`, body, hasBooking)).booking;
}

export async function fetchBookings(): Promise<Booking[]> {
  return (await getJson('/api/services/bookings', bookingItems)).items;
}

export async function fetchBooking(id: string): Promise<Booking> {
  return (await getJson(`/api/services/bookings/${encodeURIComponent(id)}`, hasBooking)).booking;
}

export async function stepBooking(id: string, to: BookingStatus): Promise<Booking> {
  return (await sendJson('POST', `/api/services/bookings/${encodeURIComponent(id)}/status`, { to }, hasBooking)).booking;
}

export async function rateBooking(id: string, stars: number): Promise<Booking> {
  return (await sendJson('POST', `/api/services/bookings/${encodeURIComponent(id)}/rating`, { stars }, hasBooking)).booking;
}

export async function fetchPendingServices(): Promise<ServiceListing[]> {
  return (await getJson('/api/admin/services', listingItems)).items;
}

const isOk = (value: unknown): value is { ok: true } => isRecord(value) && value.ok === true;
export const approveService = (id: string) => sendJson('POST', `/api/admin/services/${encodeURIComponent(id)}/approve`, {}, isOk);
export const rejectService = (id: string, reason: string) => sendJson('POST', `/api/admin/services/${encodeURIComponent(id)}/reject`, { reason }, isOk);
