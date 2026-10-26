import type { FollowUpAnswer, FollowUpDue, HistoryPage, HistoryRecord, NewHistoryEntry } from '../../types/history.js';

/**
 * Storage for past diagnoses, keyed by an anonymous device id.
 * Implementations throw AppError('HISTORY_UNAVAILABLE') when storage is unreachable.
 */
export interface HistoryRepository {
  /** Returns the new record's id (used to link feedback to the diagnosis). */
  save(entry: NewHistoryEntry): Promise<string>;
  /** Latest first. */
  list(deviceId: string, page: number, limit: number): Promise<HistoryPage>;
  /** Returns null if the record does not exist or belongs to another device. */
  findById(deviceId: string, id: string): Promise<HistoryRecord | null>;
  /** Unanswered, non-healthy diagnoses created between `from` and `to` (oldest first). */
  listFollowUpsDue(deviceId: string, from: Date, to: Date): Promise<FollowUpDue[]>;
  /** Records the farmer's answer. Returns false if the record does not exist for this device. */
  setFollowUp(deviceId: string, id: string, answer: FollowUpAnswer): Promise<boolean>;
}
