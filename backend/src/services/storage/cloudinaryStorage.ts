import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { withRetry } from '../../utils/retry.js';
import type { PhotoContent, PhotoStorage, PhotoToStore, StoredPhotoRef } from './photoStorage.js';

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  /** Folder in the Cloudinary media library, e.g. "agriai/listings". */
  folder: string;
}

/** Parses CLOUDINARY_URL as Cloudinary's dashboard shows it: cloudinary://<api_key>:<api_secret>@<cloud_name> */
export function parseCloudinaryUrl(url: string, folder: string): CloudinaryConfig | null {
  const match = /^cloudinary:\/\/([^:@\s]+):([^@\s]+)@([\w-]+)$/.exec(url.trim());
  return match?.[1] && match[2] && match[3] ? { apiKey: match[1], apiSecret: match[2], cloudName: match[3], folder } : null;
}

/** Shown to phones: at most 1024 px wide, best format (WebP/AVIF) and quality for the phone, from Cloudinary's CDN. */
const DELIVERY_TRANSFORM = 'f_auto,q_auto,c_limit,w_1024';
const TIMEOUT_MS = 20_000;

const uploadResponseSchema = z.object({ public_id: z.string().min(1) });

/**
 * Cloudinary (free tier: 25 credits a month, 1 credit ≈ 1 GB storage or 1 GB bandwidth). Uses the plain REST
 * API with signed requests, so no SDK is needed. Only the photo bytes are sent (already shrunk, without GPS).
 */
export class CloudinaryPhotoStorage implements PhotoStorage {
  readonly name = 'cloudinary';

  constructor(
    private readonly config: CloudinaryConfig,
    private readonly fetchFn: typeof fetch = fetch,
    /** Injected in tests to skip the wait before the retry. */
    private readonly sleep?: (ms: number) => Promise<void>,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async save(photo: PhotoToStore): Promise<StoredPhotoRef> {
    const form = this.signedForm({ folder: this.config.folder, public_id: randomUUID(), timestamp: this.timestamp() });
    form.set('file', new Blob([new Uint8Array(photo.buffer)], { type: photo.mimeType }));
    const body = await this.post('upload', form);
    return { storageKey: uploadResponseSchema.parse(body).public_id };
  }

  async open(storageKey: string): Promise<PhotoContent> {
    return { kind: 'redirect', url: this.deliveryUrl(storageKey) };
  }

  async remove(storageKey: string): Promise<void> {
    await this.post('destroy', this.signedForm({ public_id: storageKey, timestamp: this.timestamp() }));
  }

  deliveryUrl(storageKey: string): string {
    const path = storageKey.split('/').map(encodeURIComponent).join('/');
    return `https://res.cloudinary.com/${this.config.cloudName}/image/upload/${DELIVERY_TRANSFORM}/${path}`;
  }

  /** Cloudinary's signature: SHA-1 of the sorted "key=value" pairs joined with "&", followed by the API secret. */
  signature(params: Record<string, string>): string {
    const payload = Object.keys(params)
      .sort()
      .map((key) => `${key}=${params[key]}`)
      .join('&');
    return createHash('sha1').update(payload + this.config.apiSecret).digest('hex');
  }

  private signedForm(params: Record<string, string>): FormData {
    const form = new FormData();
    for (const [key, value] of Object.entries(params)) form.set(key, value);
    form.set('api_key', this.config.apiKey);
    form.set('signature', this.signature(params));
    return form;
  }

  private timestamp(): string {
    return String(Math.floor(this.now().getTime() / 1000));
  }

  /** One retry when Cloudinary is busy (429/5xx) or the network drops; other errors fail at once. */
  private async post(action: 'upload' | 'destroy', form: FormData): Promise<unknown> {
    const url = `https://api.cloudinary.com/v1_1/${this.config.cloudName}/image/${action}`;
    return withRetry(
      async () => {
        const response = await this.fetchFn(url, { method: 'POST', body: form, signal: AbortSignal.timeout(TIMEOUT_MS) });
        if (!response.ok) throw new CloudinaryError(response.status);
        return response.json();
      },
      { maxAttempts: 2, baseDelayMs: 1_000, sleep: this.sleep, isRetryable: (error) => !(error instanceof CloudinaryError) || error.retryable },
    );
  }
}

export class CloudinaryError extends Error {
  readonly retryable: boolean;

  constructor(readonly status: number) {
    super(`Cloudinary HTTP ${status}`);
    this.name = 'CloudinaryError';
    this.retryable = status === 429 || status >= 500;
  }
}
