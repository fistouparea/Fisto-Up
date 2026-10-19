import { isValidObjectId } from 'mongoose';
import { AppError } from '../../errors/AppError.js';
import { DiagnosisRecord } from '../../models/DiagnosisRecord.js';
import type { CropId, Diagnosis } from '../../types/diagnosis.js';
import type { HistoryPage, HistoryRecord, NewHistoryEntry } from '../../types/history.js';
import type { HistoryRepository } from './historyRepository.js';

export class MongoHistoryRepository implements HistoryRepository {
  async save(entry: NewHistoryEntry): Promise<void> {
    await withStorageErrors(() => DiagnosisRecord.create(entry));
  }

  async list(deviceId: string, page: number, limit: number): Promise<HistoryPage> {
    // Fetch one extra row to know whether another page exists.
    const rows = await withStorageErrors(() =>
      DiagnosisRecord.find({ deviceId })
        .select('crop diagnosis.problem_name diagnosis.severity createdAt')
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit + 1)
        .lean()
        .exec(),
    );

    return {
      items: rows.slice(0, limit).map((row) => ({
        id: row._id.toString(),
        crop: row.crop as CropId,
        problemName: row.diagnosis.problem_name,
        ...(row.diagnosis.severity ? { severity: row.diagnosis.severity } : {}),
        createdAt: row.createdAt,
      })),
      page,
      limit,
      hasMore: rows.length > limit,
    };
  }

  async findById(deviceId: string, id: string): Promise<HistoryRecord | null> {
    if (!isValidObjectId(id)) return null;

    const row = await withStorageErrors(() => DiagnosisRecord.findOne({ _id: id, deviceId }).lean().exec());
    if (!row) return null;

    return {
      id: row._id.toString(),
      crop: row.crop as CropId,
      diagnosis: row.diagnosis as Diagnosis,
      createdAt: row.createdAt,
    };
  }
}

async function withStorageErrors<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw new AppError('HISTORY_UNAVAILABLE', 'MongoDB operation failed', { cause: error });
  }
}
