import { randomUUID } from 'node:crypto';
import type { HistoryRepository } from '../../src/services/history/historyRepository.js';
import type { HistoryPage, HistoryRecord, NewHistoryEntry } from '../../src/types/history.js';

/** Test double for HistoryRepository with the same ordering and ownership rules as the Mongo one. */
export class InMemoryHistoryRepository implements HistoryRepository {
  readonly records: (HistoryRecord & { deviceId: string })[] = [];
  private clock = Date.parse('2026-10-01T06:00:00Z');

  async save(entry: NewHistoryEntry): Promise<void> {
    this.clock += 60_000; // each save one minute later, so ordering is predictable
    this.records.push({ ...entry, id: randomUUID(), createdAt: new Date(this.clock) });
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
}
