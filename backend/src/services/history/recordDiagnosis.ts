import type { NewHistoryEntry } from '../../types/history.js';
import type { HistoryRepository } from './historyRepository.js';
import { logger } from '../../observability/logger.js';

/** Saves a diagnosis to history. Never throws: history is a nice-to-have, the diagnosis is not. */
export async function recordDiagnosis(history: HistoryRepository | null, entry: NewHistoryEntry): Promise<void> {
  if (!history) return;
  try {
    await history.save(entry);
  } catch (error) {
    logger.error({ err: error }, 'could not save diagnosis to history');
  }
}
