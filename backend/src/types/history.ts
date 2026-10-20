import { z } from 'zod';
import type { CropId, Diagnosis, Severity } from './diagnosis.js';

export const deviceIdSchema = z.uuid();

export const MAX_HISTORY_PAGE_SIZE = 50;

export const historyListQuerySchema = z.object({
  deviceId: deviceIdSchema,
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_HISTORY_PAGE_SIZE).default(10),
});

export const historyItemParamsSchema = z.object({ id: z.string().min(1).max(64) });
export const historyItemQuerySchema = z.object({ deviceId: deviceIdSchema });

export const FOLLOW_UP_ANSWERS = ['better', 'same', 'worse'] as const;
export type FollowUpAnswer = (typeof FOLLOW_UP_ANSWERS)[number];

export const followUpBodySchema = z.object({ deviceId: deviceIdSchema, answer: z.enum(FOLLOW_UP_ANSWERS) });

/** A past diagnosis waiting for "क्या फसल ठीक हुई?". */
export interface FollowUpDue {
  id: string;
  crop: CropId;
  problemName: string;
  createdAt: Date;
}

export interface NewHistoryEntry {
  deviceId: string;
  crop: CropId;
  diagnosis: Diagnosis;
}

export interface HistoryRecord {
  id: string;
  crop: CropId;
  diagnosis: Diagnosis;
  createdAt: Date;
  followUp?: { answer: FollowUpAnswer; answeredAt: Date };
}

/** One row of the "मेरी जाँच" list. */
export interface HistorySummary {
  id: string;
  crop: CropId;
  problemName: string;
  severity?: Severity;
  createdAt: Date;
}

export interface HistoryPage {
  items: HistorySummary[];
  page: number;
  limit: number;
  hasMore: boolean;
}
