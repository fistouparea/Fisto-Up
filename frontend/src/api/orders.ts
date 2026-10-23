import { getJson, isRecord, sendJson } from './client';
import type { MarketNotification, NewOrder, Order, OrderStatus, PaymentMethod, ReportReason } from './marketTypes';

export async function placeOrder(order: NewOrder): Promise<Order> {
  return (await sendJson('POST', '/api/market/orders', order, isOrderResponse)).order;
}

export function fetchOrders(status?: OrderStatus): Promise<{ items: Order[]; hasMore: boolean }> {
  const query = status ? `?${new URLSearchParams({ status })}` : '';
  return getJson(`/api/market/orders${query}`, isOrderList);
}

export async function fetchOrder(id: string): Promise<Order> {
  return (await getJson(`/api/market/orders/${encodeURIComponent(id)}`, isOrderResponse)).order;
}

export async function moveOrder(id: string, to: OrderStatus, paidVia?: PaymentMethod): Promise<Order> {
  return (await sendJson('POST', `/api/market/orders/${encodeURIComponent(id)}/status`, { to, paidVia }, isOrderResponse)).order;
}

export async function rateOrder(id: string, stars: number, comment?: string): Promise<Order> {
  return (await sendJson('POST', `/api/market/orders/${encodeURIComponent(id)}/rating`, { stars, comment }, isOrderResponse)).order;
}

export async function reportProblem(report: { orderId?: string; listingId?: string; reason: ReportReason; text?: string }): Promise<void> {
  await sendJson('POST', '/api/market/reports', report, isRecord);
}

export function fetchMarketNotifications(): Promise<{ items: MarketNotification[]; unreadCount: number }> {
  return getJson('/api/market/notifications', isNotificationList);
}

export async function markMarketNotificationsRead(ids?: string[]): Promise<void> {
  await sendJson('POST', '/api/market/notifications/read', ids ? { ids } : {}, isRecord);
}

export async function linkMarketPush(deviceId: string, subscription: PushSubscriptionJSON): Promise<void> {
  await sendJson('POST', '/api/market/push/subscribe', { deviceId, subscription }, isRecord);
}

export function isOrder(value: unknown): value is Order {
  return isRecord(value) && typeof value.id === 'string' && typeof value.status === 'string' && Array.isArray(value.allowedNext);
}

function isOrderResponse(body: unknown): body is { order: Order } {
  return isRecord(body) && isOrder(body.order);
}

function isOrderList(body: unknown): body is { items: Order[]; hasMore: boolean } {
  return isRecord(body) && Array.isArray(body.items) && body.items.every(isOrder);
}

function isNotificationList(body: unknown): body is { items: MarketNotification[]; unreadCount: number } {
  return isRecord(body) && Array.isArray(body.items) && typeof body.unreadCount === 'number';
}
