import { getJson, isRecord, sendJson } from './client';
import type { CropId } from './types';

/** Mirrors backend/src/modules/mandiPool/mandiTrip.service.ts (TripView). */
export interface MandiTrip {
  id: string;
  mandi: string;
  date: string;
  tehsil: string;
  pickupPoint: string;
  vehicle: string;
  capacityQuintal: number;
  bookedQuintal: number;
  status: TripStatus;
  members: number;
  costPerQuintalPaise?: number;
  note?: string;
  mine?: { crop: CropId; quantityQuintal: number };
  /** Coordinator panel only. */
  memberList?: { name: string; phone: string; crop: CropId; quantityQuintal: number }[];
}

/** Mirrors TRIP_STATUSES / TRIP_TRANSITIONS in backend/src/config/logisticsRules.ts. */
export const TRIP_STATUSES = ['open', 'closed', 'departed', 'completed', 'cancelled'] as const;
export type TripStatus = (typeof TRIP_STATUSES)[number];
export const TRIP_NEXT: Record<TripStatus, readonly TripStatus[]> = {
  open: ['closed', 'departed', 'cancelled'],
  closed: ['open', 'departed', 'cancelled'],
  departed: ['completed'],
  completed: [],
  cancelled: [],
};

export interface TripInput {
  mandi: string;
  date: string;
  tehsil: string;
  pickupPoint: string;
  vehicle: string;
  capacityQuintal: number;
  costPerQuintalPaise?: number;
  note?: string;
}

const isTrip = (value: unknown): value is MandiTrip => isRecord(value) && typeof value.id === 'string' && typeof value.mandi === 'string';
const isList = (value: unknown): value is { items: MandiTrip[] } => isRecord(value) && Array.isArray(value.items) && value.items.every(isTrip);
const hasTrip = (value: unknown): value is { trip: MandiTrip } => isRecord(value) && isTrip(value.trip);

export async function fetchTrips(): Promise<MandiTrip[]> {
  return (await getJson('/api/mandi-trips', isList)).items;
}
export async function joinTrip(id: string, crop: CropId, quantityQuintal: number): Promise<MandiTrip> {
  return (await sendJson('POST', `/api/mandi-trips/${encodeURIComponent(id)}/join`, { crop, quantityQuintal }, hasTrip)).trip;
}
export async function leaveTrip(id: string): Promise<MandiTrip> {
  return (await sendJson('POST', `/api/mandi-trips/${encodeURIComponent(id)}/leave`, {}, hasTrip)).trip;
}

export async function fetchAdminTrips(): Promise<MandiTrip[]> {
  return (await getJson('/api/admin/mandi-trips', isList)).items;
}
export async function createTrip(trip: TripInput): Promise<MandiTrip> {
  return (await sendJson('POST', '/api/admin/mandi-trips', trip, hasTrip)).trip;
}
export async function updateTrip(id: string, change: Partial<TripInput>): Promise<MandiTrip> {
  return (await sendJson('PATCH', `/api/admin/mandi-trips/${encodeURIComponent(id)}`, change, hasTrip)).trip;
}
export async function setTripStatus(id: string, status: TripStatus): Promise<MandiTrip> {
  return (await sendJson('POST', `/api/admin/mandi-trips/${encodeURIComponent(id)}/status`, { status }, hasTrip)).trip;
}
