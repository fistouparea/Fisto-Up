import type { NewHistoryEntry } from '../../types/history.js';
import type { HistoryRepository } from './historyRepository.js';
import { logger } from '../../observability/logger.js';

/**
 * Saves a diagnosis to history and returns its id (null when not saved).
 * Never throws: history is a nice-to-have, the diagnosis is not.
 */
export async function recordDiagnosis(history: HistoryRepository | null, entry: NewHistoryEntry): Promise<string | null> {
  if (!history) return null;
  try {
    return await history.save(entry);
  } catch (error) {
    logger.error({ err: error }, 'could not save diagnosis to history');
    return null;
  }
}
