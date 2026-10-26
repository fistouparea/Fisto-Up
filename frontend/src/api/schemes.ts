import { getJson, isRecord, sendJson } from './client';
import { getDeviceId } from '../utils/deviceId';

/** Mirrors backend/src/data/schemes.ts and modules/schemes. */
export interface Scheme {
  id: string;
  level: 'central' | 'rajasthan';
  name: string;
  summary: string;
  whoCanApply: string[];
  documents: string[];
  officialLink: string;
  helpline: string | null;
  source_url: string;
  last_verified: string | null;
  status: 'verified' | 'verify';
}

export interface SchemeForMe extends Scheme {
  hints: string[];
  checkLine: string;
}

export type SchemeChange = Partial<Pick<Scheme, 'summary' | 'whoCanApply' | 'documents' | 'officialLink' | 'source_url' | 'status'>> & {
  helpline?: string;
  last_verified?: string;
};

const isScheme = (value: unknown): value is Scheme => isRecord(value) && typeof value.id === 'string' && typeof value.name === 'string';
const isList = (value: unknown): value is { items: SchemeForMe[] } => isRecord(value) && Array.isArray(value.items) && value.items.every(isScheme);

/** "मेरे लिए योजनाएँ": hints come from this phone's farm profile. */
export async function fetchSchemesForMe(): Promise<SchemeForMe[]> {
  return (await getJson(`/api/schemes?${new URLSearchParams({ deviceId: getDeviceId() })}`, isList)).items;
}

export async function fetchAdminSchemes(): Promise<Scheme[]> {
  return (await getJson('/api/admin/schemes', isList)).items;
}

export async function updateScheme(id: string, change: SchemeChange): Promise<Scheme> {
  return (await sendJson('PUT', `/api/admin/schemes/${encodeURIComponent(id)}`, change, (value): value is { scheme: Scheme } => isRecord(value) && isScheme(value.scheme))).scheme;
}
