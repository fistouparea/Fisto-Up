import type { Env } from '../../config/env.js';
import { CloudinaryPhotoStorage, parseCloudinaryUrl } from './cloudinaryStorage.js';
import { DatabasePhotoStorage, type PhotoStorage } from './photoStorage.js';

/** The one place that decides where listing photos are stored (STORAGE_PROVIDER in .env). */
export function createPhotoStorage(env: Env): PhotoStorage {
  switch (env.STORAGE_PROVIDER) {
    case 'database':
      return new DatabasePhotoStorage();
    case 'cloudinary': {
      // loadEnv already refused a missing or malformed CLOUDINARY_URL for this provider.
      const config = env.CLOUDINARY_URL ? parseCloudinaryUrl(env.CLOUDINARY_URL, env.CLOUDINARY_FOLDER) : null;
      if (!config) throw new Error('CLOUDINARY_URL is missing or invalid');
      return new CloudinaryPhotoStorage(config);
    }
  }
}
