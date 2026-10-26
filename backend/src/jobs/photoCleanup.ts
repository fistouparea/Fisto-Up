import cron, { type ScheduledTask } from 'node-cron';
import { LISTING_RULES } from '../config/marketRules.js';
import { ListingPhotoModel } from '../modules/listings/listing.model.js';
import { logger } from '../observability/logger.js';
import type { PhotoStorage } from '../services/storage/photoStorage.js';

const BATCH = 200;

/**
 * Deletes uploads that never became part of a listing (e.g. after "दूसरी फोटो लें") once they are older than
 * LISTING_RULES.unattachedPhotoHours: first the file at the provider, then the record. A file that cannot be
 * deleted keeps its record, so the next run tries again (nothing is left orphaned at Cloudinary).
 */
export async function removeUnusedPhotos(storage: PhotoStorage, now: Date = new Date()): Promise<{ removed: number; failed: number }> {
  const cutoff = new Date(now.getTime() - LISTING_RULES.unattachedPhotoHours * 3_600_000);
  const unused = await ListingPhotoModel.find({ attached: false, createdAt: { $lt: cutoff } }, { storageKey: 1 }).limit(BATCH).lean().exec();
  let removed = 0;
  let failed = 0;
  for (const photo of unused) {
    try {
      if (photo.storageKey) await storage.remove(photo.storageKey);
      // Only if still unused: a seller may have attached it a moment ago.
      const result = await ListingPhotoModel.deleteOne({ _id: photo._id, attached: false }).exec();
      removed += result.deletedCount;
    } catch (error) {
      failed += 1;
      logger.error({ err: error }, 'unused photo not removed');
    }
  }
  return { removed, failed };
}

/** Runs the cleanup every hour. Also drops the TTL index of Phase 3 (it deleted records but not Cloudinary files). */
export function startPhotoCleanup(storage: PhotoStorage): ScheduledTask {
  void ListingPhotoModel.syncIndexes().catch((error: unknown) => logger.warn({ err: error }, 'listing photo indexes not synced'));
  return cron.schedule(
    '17 * * * *',
    async () => {
      const result = await removeUnusedPhotos(storage);
      if (result.removed > 0 || result.failed > 0) logger.info({ job: 'photo-cleanup', ...result }, 'unused photos removed');
    },
    { noOverlap: true, name: 'photo-cleanup' },
  );
}
