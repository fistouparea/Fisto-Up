import { getJson, isRecord, sendJson } from './client';
import type { Role, SellerStatus } from './marketTypes';

/** Coordinator API of the control centre: waiting work and accounts. */

export interface Attention {
  pendingSellers: number;
  newOrders: number;
  complaints: number;
  overdueComplaints: number;
  helpRequests: number;
  serviceApprovals: number;
  duePaise: number;
  sellersNeedingUpi: number;
  demoCoordinators: number;
}

export interface AdminUser {
  id: string;
  name: string;
  phone: string;
  role: Role;
  village?: string;
  sellerStatus?: SellerStatus;
  pilot: boolean;
  demo: boolean;
  locked: boolean;
  createdAt: string;
}

export interface UserPage {
  items: AdminUser[];
  total: number;
  hasMore: boolean;
}

export const fetchAttention = () => getJson('/api/admin/attention', (body): body is Attention => isRecord(body) && typeof body.pendingSellers === 'number');

export function fetchUsers({ q, role, locked, page }: { q: string; role?: Role; locked: boolean; page: number }): Promise<UserPage> {
  const params = new URLSearchParams({ page: String(page) });
  if (q.trim()) params.set('q', q.trim());
  if (role) params.set('role', role);
  if (locked) params.set('locked', 'true');
  return getJson(`/api/admin/users?${params}`, (body): body is UserPage => isRecord(body) && Array.isArray(body.items) && typeof body.total === 'number');
}

const userAction = (action: 'end-sessions' | 'unlock') => (id: string) =>
  sendJson('POST', `/api/admin/users/${encodeURIComponent(id)}/${action}`, {}, (body): body is { user: AdminUser } => isRecord(body) && isRecord(body.user));

export const endUserSessions = userAction('end-sessions');
export const unlockUser = userAction('unlock');
