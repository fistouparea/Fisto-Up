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
  status: 'open' | 'closed' | 'cancelled';
  members: number;
  mine?: { crop: CropId; quantityQuintal: number };
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
