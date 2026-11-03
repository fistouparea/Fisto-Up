import { getJson, isRecord, requestApi, sendJson } from './client';
import type { ReportReason } from './marketTypes';

/** Mirrors backend/src/config/complaintRules.ts and modules/complaints/complaint.service.ts. */
export const COMPLAINT_STATUSES = ['open', 'in_progress', 'resolved', 'rejected'] as const;
export type ComplaintStatus = (typeof COMPLAINT_STATUSES)[number];
export type ComplaintTargetKind = 'order' | 'booking' | 'listing' | 'serviceListing';

export interface Complaint {
  id: string;
  category: ReportReason;
  text?: string;
  status: ComplaintStatus;
  target: { kind: ComplaintTargetKind; id: string; title: string };
  reporter: { name: string; role: string };
  against?: { name: string };
  photoUrl?: string;
  messages: { fromRole: string; text: string; at: string; mine: boolean }[];
  resolution?: string;
  slaDueAt?: string;
  overdue: boolean;
  viewerRole: 'reporter' | 'against' | 'coordinator';
  allowedNext: ComplaintStatus[];
  createdAt: string;
}

const isComplaint = (value: unknown): value is Complaint => isRecord(value) && typeof value.id === 'string' && Array.isArray(value.messages);
const hasComplaint = (value: unknown): value is { complaint: Complaint } => isRecord(value) && isComplaint(value.complaint);
const isStatusResult = (value: unknown): value is { complaint: Complaint; flagged: boolean } => isRecord(value) && typeof value.flagged === 'boolean' && isComplaint(value.complaint);
const isList = (value: unknown): value is { items: Complaint[] } => isRecord(value) && Array.isArray(value.items) && value.items.every(isComplaint);

export async function uploadComplaintPhoto(photo: Blob): Promise<string> {
  const form = new FormData();
  form.append('image', photo, 'complaint.jpg');
  return (await requestApi('/api/complaints/photos', { method: 'POST', body: form }, (value): value is { photoId: string } => isRecord(value) && typeof value.photoId === 'string')).photoId;
}
export async function raiseComplaint(body: { target: { kind: ComplaintTargetKind; id: string }; category: ReportReason; text: string; photoId?: string }): Promise<Complaint> {
  return (await sendJson('POST', '/api/complaints', body, hasComplaint)).complaint;
}
export async function fetchMyComplaints(): Promise<Complaint[]> {
  return (await getJson('/api/complaints', isList)).items;
}
export async function fetchComplaint(id: string): Promise<Complaint> {
  return (await getJson(`/api/complaints/${encodeURIComponent(id)}`, hasComplaint)).complaint;
}
export async function sendComplaintMessage(id: string, text: string): Promise<Complaint> {
  return (await sendJson('POST', `/api/complaints/${encodeURIComponent(id)}/messages`, { text }, hasComplaint)).complaint;
}
export async function fetchComplaintQueue(status?: ComplaintStatus): Promise<Complaint[]> {
  return (await getJson(`/api/admin/complaints${status ? `?status=${status}` : ''}`, isList)).items;
}
export async function setComplaintStatus(id: string, to: ComplaintStatus, resolution?: string): Promise<{ complaint: Complaint; flagged: boolean }> {
  return sendJson('POST', `/api/admin/complaints/${encodeURIComponent(id)}/status`, { to, ...(resolution && { resolution }) }, isStatusResult);
}
export const clearReviewFlag = (userId: string) =>
  sendJson('POST', `/api/admin/users/${encodeURIComponent(userId)}/clear-flag`, {}, (value): value is { ok: true } => isRecord(value) && value.ok === true);

/** Hours (rounded down, may be negative) until the SLA time; null without one. */
export function slaHoursLeft(complaint: Pick<Complaint, 'slaDueAt'>, now = Date.now()): number | null {
  return complaint.slaDueAt ? Math.floor((Date.parse(complaint.slaDueAt) - now) / 3_600_000) : null;
}
