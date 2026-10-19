import type { NewHistoryEntry } from '../../types/history.js';
import type { HistoryRepository } from './historyRepository.js';

/** Saves a diagnosis to history. Never throws: history is a nice-to-have, the diagnosis is not. */
export async function recordDiagnosis(history: HistoryRepository | null, entry: NewHistoryEntry): Promise<void> {
  if (!history) return;
  try {
    await history.save(entry);
  } catch (error) {
    console.error('Could not save diagnosis to history:', error instanceof Error ? error.message : error);
  }
}
