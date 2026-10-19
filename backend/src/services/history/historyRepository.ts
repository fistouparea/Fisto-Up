import type { HistoryPage, HistoryRecord, NewHistoryEntry } from '../../types/history.js';

/**
 * Storage for past diagnoses, keyed by an anonymous device id.
 * Implementations throw AppError('HISTORY_UNAVAILABLE') when storage is unreachable.
 */
export interface HistoryRepository {
  save(entry: NewHistoryEntry): Promise<void>;
  /** Latest first. */
  list(deviceId: string, page: number, limit: number): Promise<HistoryPage>;
  /** Returns null if the record does not exist or belongs to another device. */
  findById(deviceId: string, id: string): Promise<HistoryRecord | null>;
}
