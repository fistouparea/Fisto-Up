import { randomUUID } from 'node:crypto';
import type { HistoryRepository } from '../../src/services/history/historyRepository.js';
import type {
  FollowUpAnswer,
  FollowUpDue,
  HistoryPage,
  HistoryRecord,
  NewHistoryEntry,
} from '../../src/types/history.js';

type StoredRecord = HistoryRecord & { deviceId: string };

/** Test double for HistoryRepository with the same ordering and ownership rules as the Mongo one. */
export class InMemoryHistoryRepository implements HistoryRepository {
  readonly records: StoredRecord[] = [];
  private clock = Date.parse('2026-10-01T06:00:00Z');

  async save(entry: NewHistoryEntry): Promise<string> {
    this.clock += 60_000; // each save one minute later, so ordering is predictable
    return this.seed(entry, new Date(this.clock));
  }

  /** Adds a record with a chosen creation time (for follow-up tests). */
  seed(entry: NewHistoryEntry, createdAt: Date): string {
    const id = randomUUID();
    this.records.push({ ...entry, id, createdAt });
    return id;
  }

  async list(deviceId: string, page: number, limit: number): Promise<HistoryPage> {
    const mine = this.records
      .filter((record) => record.deviceId === deviceId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const start = (page - 1) * limit;

    return {
      items: mine.slice(start, start + limit).map((record) => ({
        id: record.id,
        crop: record.crop,
        problemName: record.diagnosis.problem_name,
        ...(record.diagnosis.severity ? { severity: record.diagnosis.severity } : {}),
        createdAt: record.createdAt,
      })),
      page,
      limit,
      hasMore: mine.length > start + limit,
    };
  }

  async findById(deviceId: string, id: string): Promise<HistoryRecord | null> {
    const record = this.records.find((candidate) => candidate.id === id && candidate.deviceId === deviceId);
    if (!record) return null;
    const { deviceId: _deviceId, ...rest } = record;
    return rest;
  }

  async listFollowUpsDue(deviceId: string, from: Date, to: Date): Promise<FollowUpDue[]> {
    return this.records
      .filter(
        (record) =>
          record.deviceId === deviceId &&
          !record.followUp &&
          record.diagnosis.severity !== 'healthy' &&
          record.createdAt >= from &&
          record.createdAt <= to,
      )
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((record) => ({ id: record.id, crop: record.crop, problemName: record.diagnosis.problem_name, createdAt: record.createdAt }));
  }

  async setFollowUp(deviceId: string, id: string, answer: FollowUpAnswer): Promise<boolean> {
    const record = this.records.find((candidate) => candidate.id === id && candidate.deviceId === deviceId);
    if (!record) return false;
    record.followUp = { answer, answeredAt: new Date() };
    return true;
  }
}
