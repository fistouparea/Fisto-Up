import { getJson, isRecord, sendJson } from './client';
import type { HelpCategory } from './help';

/** Coordinator API for the pilot: help requests, invite codes, feature flags, audit log. */

export interface AdminHelpRequest {
  id: string;
  category: HelpCategory;
  message: string;
  status: 'open' | 'resolved';
  from: { name: string; role: string } | null;
  phone?: string;
  resolution?: string;
  createdAt: string;
}

export interface Invite {
  id: string;
  code: string;
  role?: 'seller' | 'buyer';
  note?: string;
  maxUses: number;
  uses: number;
  expiresAt?: string;
  revoked: boolean;
  usable: boolean;
  createdAt: string;
}

export type FlagState = 'off' | 'pilot' | 'all';

export interface AdminFlag {
  key: string;
  description: string;
  state: FlagState;
  default: FlagState;
}

export interface AuditEntry {
  id: string;
  at: string;
  actorId: string;
  actorRole: string;
  action: string;
  target: { type: string; id: string };
  details?: Record<string, string | number | boolean | null>;
}

const items =
  <T,>(check: (item: unknown) => boolean) =>
  (body: unknown): body is { items: T[] } =>
    isRecord(body) && Array.isArray(body.items) && body.items.every(check);
const hasId = (item: unknown) => isRecord(item) && typeof item.id === 'string';
const isInviteBody = (body: unknown): body is { invite: Invite } => isRecord(body) && hasId(body.invite);

export async function fetchHelpRequests(): Promise<AdminHelpRequest[]> {
  return (await getJson('/api/admin/help?status=open', items<AdminHelpRequest>(hasId))).items;
}
export const resolveHelpRequest = (id: string, resolution?: string) =>
  sendJson('POST', `/api/admin/help/${encodeURIComponent(id)}/resolve`, resolution ? { resolution } : {}, isRecord);

export async function fetchInvites(): Promise<Invite[]> {
  return (await getJson('/api/admin/invites', items<Invite>(hasId))).items;
}
export async function createInvite(input: { maxUses: number; role?: 'seller' | 'buyer'; note?: string; expiresInDays?: number }): Promise<Invite> {
  return (await sendJson('POST', '/api/admin/invites', input, isInviteBody)).invite;
}
export const revokeInvite = (id: string) => sendJson('POST', `/api/admin/invites/${encodeURIComponent(id)}/revoke`, {}, isInviteBody);

export async function fetchAdminFlags(): Promise<AdminFlag[]> {
  return (await getJson('/api/admin/flags', items<AdminFlag>((item) => isRecord(item) && typeof item.key === 'string'))).items;
}
export async function setAdminFlag(key: string, state: FlagState): Promise<AdminFlag[]> {
  return (await sendJson('PUT', `/api/admin/flags/${encodeURIComponent(key)}`, { state }, items<AdminFlag>(isRecord))).items;
}

export async function fetchAudit(page: number): Promise<{ items: AuditEntry[]; hasMore: boolean }> {
  return getJson(`/api/admin/audit?page=${page}`, (body): body is { items: AuditEntry[]; hasMore: boolean } => items<AuditEntry>(hasId)(body) && typeof (body as { hasMore?: unknown }).hasMore === 'boolean');
}
