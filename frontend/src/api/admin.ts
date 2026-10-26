import { downloadFile, getJson, isRecord, sendJson } from './client';
import type { NewListing, Order, OrderStatus, Place, ReportReason, SellerListing, SellerStatus } from './marketTypes';
import { isOrder } from './orders';
import { isSellerListing } from './listings';

/** Coordinator panel API. Mirrors backend/src/modules/admin and commission/ledger.service.ts. */

export interface AdminSeller {
  id: string;
  name: string;
  phone: string;
  status: SellerStatus;
  village?: string;
  shgName?: string;
  upiId?: string;
  pickup?: Place;
  rejectReason?: string;
  profileComplete: boolean;
  listings: number;
  rating: { average: number | null; count: number };
  createdAt: string;
  assisted: boolean;
}

export interface AdminReport {
  id: string;
  reason: ReportReason;
  text?: string;
  status: 'open' | 'resolved';
  reporter: { name: string; role: string };
  orderId?: string;
  listing?: { id: string; title: string; hidden: boolean; sellerName: string };
  resolution?: string;
  createdAt: string;
}

export interface MarketStats {
  sellers: { total: number; pending: number; verified: number; rejected: number };
  buyers: number;
  listings: { total: number; visible: number };
  orders: { total: number; open: number; completed: number; byStatus: Partial<Record<OrderStatus, number>> };
  salesPaise: number;
  commission: { totalPaise: number; collectedPaise: number; duePaise: number };
  openReports: number;
  commissionPercent: number;
}

export interface MonthTotal {
  month: string;
  orders: number;
  salesPaise: number;
  commissionPaise: number;
  collectedPaise: number;
  duePaise: number;
}

export interface SellerDues {
  sellerId: string;
  name: string;
  village?: string;
  phone: string;
  orders: number;
  salesPaise: number;
  commissionPaise: number;
  collectedPaise: number;
  duePaise: number;
}

export interface NewSellerInput {
  name: string;
  phone: string;
  pin: string;
  village: string;
  shgName?: string;
  upiId: string;
  pickup: Place;
}

export type ConsentMethod = 'verbal' | 'thumbprint' | 'signed';

const isItems = <T,>(check: (item: unknown) => item is T) => (body: unknown): body is { items: T[] } =>
  isRecord(body) && Array.isArray(body.items) && body.items.every(check);
const isAdminSeller = (value: unknown): value is AdminSeller => isRecord(value) && typeof value.phone === 'string' && typeof value.status === 'string';
const isReport = (value: unknown): value is AdminReport => isRecord(value) && typeof value.reason === 'string';
const isMonth = (value: unknown): value is MonthTotal => isRecord(value) && typeof value.month === 'string';
const isDues = (value: unknown): value is SellerDues => isRecord(value) && typeof value.sellerId === 'string';
const isOk = (body: unknown): body is Record<string, unknown> => isRecord(body);

export const fetchStats = () => getJson('/api/admin/stats', (body): body is MarketStats => isRecord(body) && isRecord(body.sellers));

export async function fetchSellers(status?: SellerStatus, q?: string): Promise<AdminSeller[]> {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (q?.trim()) params.set('q', q.trim());
  return (await getJson(`/api/admin/sellers?${params}`, isItems(isAdminSeller))).items;
}

export const verifySeller = (id: string) => sendJson('POST', `/api/admin/sellers/${encodeURIComponent(id)}/verify`, {}, isOk);
export const rejectSeller = (id: string, reason: string) =>
  sendJson('POST', `/api/admin/sellers/${encodeURIComponent(id)}/reject`, { reason }, isOk);
export const createSeller = (input: NewSellerInput) => sendJson('POST', '/api/admin/sellers', input, isOk);

export async function fetchReports(status: 'open' | 'resolved' = 'open'): Promise<AdminReport[]> {
  return (await getJson(`/api/admin/reports?status=${status}`, isItems(isReport))).items;
}
export const resolveReport = (id: string, resolution?: string) =>
  sendJson('POST', `/api/admin/reports/${encodeURIComponent(id)}/resolve`, resolution ? { resolution } : {}, isOk);
export const hideListing = (id: string, reason: string) => sendJson('POST', `/api/admin/listings/${encodeURIComponent(id)}/hide`, { reason }, isOk);
export const unhideListing = (id: string) => sendJson('POST', `/api/admin/listings/${encodeURIComponent(id)}/unhide`, {}, isOk);
export async function fetchHiddenListings(): Promise<SellerListing[]> {
  return (await getJson('/api/admin/listings/hidden', isItems(isSellerListing))).items;
}

export async function createAssistedListing(
  listing: NewListing,
  sellerId: string,
  consent: { method: ConsentMethod; note?: string },
): Promise<SellerListing> {
  const body = await sendJson('POST', '/api/admin/listings', { ...listing, sellerId, consent }, (data): data is { listing: SellerListing } =>
    isRecord(data) && isSellerListing(data.listing),
  );
  return body.listing;
}

export async function fetchAdminOrders(status?: OrderStatus): Promise<Order[]> {
  return (await getJson(`/api/admin/orders${status ? `?status=${status}` : ''}`, isItems(isOrder))).items;
}
export const assignDeliveryPerson = (orderId: string, person: { name: string; phone: string }) =>
  sendJson('PUT', `/api/admin/orders/${encodeURIComponent(orderId)}/delivery`, person, isOk);

export async function fetchMonthTotals(): Promise<MonthTotal[]> {
  return (await getJson('/api/admin/commission/months', isItems(isMonth))).items;
}
export async function fetchSellerDues(month?: string): Promise<SellerDues[]> {
  return (await getJson(`/api/admin/commission${month ? `?month=${month}` : ''}`, isItems(isDues))).items;
}
export const markCollected = (sellerId: string, month?: string) =>
  sendJson('POST', '/api/admin/commission/collect', { sellerId, ...(month && { month }) }, (body): body is { entries: number; amountPaise: number } =>
    isRecord(body) && typeof body.amountPaise === 'number',
  );

export const downloadLedgerCsv = (month?: string) => downloadFile(`/api/admin/commission/export.csv${month ? `?month=${month}` : ''}`);
