import { getJson, isRecord } from './client';
import type { PublicListing } from './marketTypes';
import type { InputGenericId } from '../data/inputGenerics';

/** Mirrors backend/src/modules/inputs/inputKit.service.ts. */
export interface KitItem {
  name: string;
  generic: { id: InputGenericId; hi: string; en: string } | null;
  products: PublicListing[];
}

export interface Kit {
  items: KitItem[];
  radiusKm: number | null;
}

const isKit = (value: unknown): value is Kit => isRecord(value) && Array.isArray(value.items);

/** "ज़रूरी सामान" for the medicine names of a diagnosis; the farm's location finds nearby dealers. */
export function fetchKit(names: string[], location?: { lat: number; lon: number }): Promise<Kit> {
  const params = new URLSearchParams();
  for (const name of names) params.append('name', name);
  if (location) {
    params.set('lat', String(location.lat));
    params.set('lon', String(location.lon));
  }
  return getJson(`/api/market/inputs/kit?${params}`, isKit);
}
