import type { ImageMimeType } from '../../types/diagnosis.js';

export interface PhotoToStore {
  buffer: Buffer;
  mimeType: ImageMimeType;
}

/** What is kept on the listing_photos document: the bytes themselves, or the key of the stored file. */
export type StoredPhotoRef = { data: Buffer } | { storageKey: string };

/** How to answer GET /api/market/photos/:id: send the bytes, or redirect to a CDN. */
export type PhotoContent = { kind: 'bytes'; data: Buffer; mimeType: string } | { kind: 'redirect'; url: string };

export type PhotoSize = 'thumb' | 'full';

export const STORAGE_PROVIDERS = ['database', 'cloudinary'] as const;
export type StorageProviderName = (typeof STORAGE_PROVIDERS)[number];

/**
 * Where listing photos live. `database` (default; development, tests, a tiny pilot) keeps the bytes in MongoDB.
 * `cloudinary` (production, free tier) keeps MongoDB small and serves resized photos from a CDN.
 * Choose with STORAGE_PROVIDER. Photos saved earlier in the database keep working with either provider.
 */
export interface PhotoStorage {
  readonly name: StorageProviderName;
  save(photo: PhotoToStore): Promise<StoredPhotoRef>;
  /** Content of a photo stored under `storageKey` by this provider; "thumb" = small version for cards. */
  open(storageKey: string, size?: PhotoSize): Promise<PhotoContent>;
  /** Deletes a stored file. */
  remove(storageKey: string): Promise<void>;
}

/** Photos inside MongoDB documents: no account or setup needed. */
export class DatabasePhotoStorage implements PhotoStorage {
  readonly name = 'database';

  async save(photo: PhotoToStore): Promise<StoredPhotoRef> {
    return { data: photo.buffer };
  }

  // Database photos have no storage key: their bytes are on the document (see photoContent in listing.service).
  async open(): Promise<PhotoContent> {
    throw new Error('Database photos have no storage key');
  }

  async remove(): Promise<void> {}
}
