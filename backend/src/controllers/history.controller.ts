import type { RequestHandler, Response } from 'express';
import { AppError } from '../errors/AppError.js';
import type { HistoryRepository } from '../services/history/historyRepository.js';
import {
  historyItemParamsSchema,
  historyItemQuerySchema,
  historyListQuerySchema,
  type HistoryPage,
  type HistoryRecord,
} from '../types/history.js';

export function createHistoryListController(history: HistoryRepository | null): RequestHandler {
  return async (req, res: Response<HistoryPage>) => {
    const query = historyListQuerySchema.safeParse(req.query);
    if (!query.success) {
      throw new AppError('INVALID_INPUT', 'Invalid history query');
    }

    const { deviceId, page, limit } = query.data;
    res.json(await requireHistory(history).list(deviceId, page, limit));
  };
}

export function createHistoryItemController(history: HistoryRepository | null): RequestHandler {
  return async (req, res: Response<HistoryRecord>) => {
    const params = historyItemParamsSchema.safeParse(req.params);
    const query = historyItemQuerySchema.safeParse(req.query);
    if (!params.success || !query.success) {
      throw new AppError('INVALID_INPUT', 'Invalid history item request');
    }

    const record = await requireHistory(history).findById(query.data.deviceId, params.data.id);
    if (!record) {
      throw new AppError('NOT_FOUND', 'History item not found');
    }
    res.json(record);
  };
}

function requireHistory(history: HistoryRepository | null): HistoryRepository {
  if (!history) {
    throw new AppError('HISTORY_UNAVAILABLE', 'History is not configured (MONGO_URI missing)');
  }
  return history;
}
