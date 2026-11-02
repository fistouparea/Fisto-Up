import { getJson, isRecord, requestApi, sendJson } from './client';

/** Mirrors backend/src/config/logisticsRules.ts (DELIVERY_STEPS) and modules/delivery. */
export const DELIVERY_STEPS = ['picked', 'on_the_way', 'delivered'] as const;
export type DeliveryStep = (typeof DELIVERY_STEPS)[number];

export interface DeliveryEvent {
  step: DeliveryStep;
  at: string;
  photoUrl?: string;
}

export interface DeliveryPage {
  ref: string;
  item: string;
  quantity: string;
  buyerName: string;
  address: string;
  done: DeliveryStep[];
  next: DeliveryStep | null;
  expiresAt: string;
}

const hasDelivery = (value: unknown): value is { delivery: DeliveryPage } => isRecord(value) && isRecord(value.delivery) && Array.isArray(value.delivery.done);

/** Coordinator: a fresh no-login link for the delivery person (replaces the old one). */
export async function createDeliveryLink(orderId: string): Promise<{ token: string; expiresAt: string }> {
  return sendJson('POST', `/api/admin/orders/${encodeURIComponent(orderId)}/delivery-link`, {}, (value): value is { token: string; expiresAt: string } => isRecord(value) && typeof value.token === 'string');
}

export async function fetchDelivery(token: string): Promise<DeliveryPage> {
  return (await getJson(`/api/delivery/${encodeURIComponent(token)}`, hasDelivery)).delivery;
}

export async function reportDeliveryStep(token: string, step: DeliveryStep, photo: Blob | null): Promise<DeliveryPage> {
  const form = new FormData();
  form.append('step', step);
  if (photo) form.append('photo', photo, 'proof.jpg');
  return (await requestApi(`/api/delivery/${encodeURIComponent(token)}/step`, { method: 'POST', body: form }, hasDelivery)).delivery;
}

/** The link to send by WhatsApp/SMS: the app's address + the token route. */
export function deliveryLinkUrl(token: string, origin = window.location.origin + window.location.pathname): string {
  return `${origin}#/delivery/${token}`;
}
