import { downloadFile, getJson, isRecord } from './client';
import type { CropId } from './types';
import type { ProductId } from './marketTypes';

/** Mirrors backend/src/modules/metrics/pilotDashboard.ts. Money in paise. */
export interface PilotDashboard {
  weeks: string[];
  weeklyActiveFarmers: { week: string; farmers: number }[];
  diagnoses: { week: string; ok: number; unclear: number }[];
  aiFeedbackByCrop: { crop: CropId; answers: number; helpful: number; helpfulPercent: number }[];
  followUps: { better: number; same: number; worse: number };
  market: { week: string; listings: number; orders: number; completed: number; salesPaise: number; commissionPaise: number }[];
  totals: { listings: number; activeListings: number; orders: number; completedOrders: number; salesPaise: number; commissionPaise: number };
  priceVsMandi: { product: ProductId; listings: number; listedPerQuintalPaise: number | null; soldPerQuintalPaise: number | null; mandiPerQuintalPaise: number | null }[];
}

export const DASHBOARD_EXPORTS = ['weekly-active-farmers', 'diagnoses', 'ai-feedback-by-crop', 'follow-ups', 'market', 'price-vs-mandi'] as const;
export type DashboardExport = (typeof DASHBOARD_EXPORTS)[number];

export function fetchPilotDashboard(weeks: number): Promise<PilotDashboard> {
  return getJson(`/api/admin/pilot?weeks=${weeks}`, (body): body is PilotDashboard => isRecord(body) && Array.isArray(body.weeks) && isRecord(body.totals));
}

export const downloadDashboardCsv = (name: DashboardExport | 'feedback-comments', weeks: number) =>
  downloadFile(name === 'feedback-comments' ? `/api/admin/pilot/feedback-comments.csv?weeks=${weeks}` : `/api/admin/pilot/export/${name}.csv?weeks=${weeks}`);
