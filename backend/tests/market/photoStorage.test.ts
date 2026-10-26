import { createHash } from 'node:crypto';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { loadEnv } from '../../src/config/env.js';
import { removeUnusedPhotos } from '../../src/jobs/photoCleanup.js';
import { ListingPhotoModel } from '../../src/modules/listings/listing.model.js';
import { CloudinaryPhotoStorage, parseCloudinaryUrl } from '../../src/services/storage/cloudinaryStorage.js';
import type { PhotoStorage } from '../../src/services/storage/photoStorage.js';
import { JPEG_BYTES } from '../helpers.js';
import { useTestDatabase } from '../setup/testDatabase.js';
import { createMarketTestApp, readySeller } from './marketHelpers.js';

useTestDatabase();

const config = { cloudName: 'demo-cloud', apiKey: 'key123', apiSecret: 'secret456', folder: 'agriai/listings' };
const sleep = async () => undefined;

/** A storage provider that keeps files in a Map and serves them from a fake CDN. */
function fakeCdnStorage() {
  const files = new Map<string, Buffer>();
  let counter = 0;
  const storage: PhotoStorage = {
    name: 'cloudinary',
    save: vi.fn(async (photo) => {
      counter += 1;
      files.set(`agriai/p${counter}`, photo.buffer);
      return { storageKey: `agriai/p${counter}` };
    }),
    open: vi.fn(async (key: string) => ({ kind: 'redirect' as const, url: `https://cdn.example/${key}` })),
    remove: vi.fn(async (key: string) => {
      files.delete(key);
    }),
  };
  return { storage, files };
}

describe('Cloudinary storage', () => {
  it('reads CLOUDINARY_URL as shown in the Cloudinary dashboard', () => {
    expect(parseCloudinaryUrl('cloudinary://key123:secret456@demo-cloud', 'f')).toEqual({ ...config, folder: 'f' });
    expect(parseCloudinaryUrl('https://demo-cloud', 'f')).toBeNull();
  });

  it('uploads with a correct signed request and keeps only the public id', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => Response.json({ public_id: 'agriai/listings/abc' }));
    const storage = new CloudinaryPhotoStorage(config, fetchFn, sleep, () => new Date('2026-11-10T00:00:00Z'));
    await expect(storage.save({ buffer: JPEG_BYTES, mimeType: 'image/jpeg' })).resolves.toEqual({ storageKey: 'agriai/listings/abc' });

    const [url, init] = fetchFn.mock.calls[0] ?? [];
    expect(url).toBe('https://api.cloudinary.com/v1_1/demo-cloud/image/upload');
    const form = init?.body as FormData;
    const timestamp = String(Date.parse('2026-11-10T00:00:00Z') / 1000);
    const expected = createHash('sha1')
      .update(`folder=agriai/listings&public_id=${String(form.get('public_id'))}&timestamp=${timestamp}secret456`)
      .digest('hex');
    expect(form.get('signature')).toBe(expected);
    expect(form.get('api_key')).toBe('key123');
    expect(form.get('file')).toBeInstanceOf(Blob);
    // The secret itself never travels.
    expect([...form.values()].some((value) => value === 'secret456')).toBe(false);
  });

  it('retries once when Cloudinary is busy, but not on an auth error', async () => {
    const busy = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response('busy', { status: 503 })).mockResolvedValueOnce(Response.json({ public_id: 'x' }));
    await expect(new CloudinaryPhotoStorage(config, busy, sleep).save({ buffer: JPEG_BYTES, mimeType: 'image/jpeg' })).resolves.toEqual({ storageKey: 'x' });
    expect(busy).toHaveBeenCalledTimes(2);

    const denied = vi.fn<typeof fetch>(async () => new Response('no', { status: 401 }));
    await expect(new CloudinaryPhotoStorage(config, denied, sleep).save({ buffer: JPEG_BYTES, mimeType: 'image/jpeg' })).rejects.toThrow('401');
    expect(denied).toHaveBeenCalledTimes(1);
  });

  it('serves resized, phone-friendly photos from the CDN', async () => {
    const storage = new CloudinaryPhotoStorage(config, vi.fn());
    await expect(storage.open('agriai/listings/abc')).resolves.toEqual({
      kind: 'redirect',
      url: 'https://res.cloudinary.com/demo-cloud/image/upload/f_auto,q_auto,c_limit,w_1024/agriai/listings/abc',
    });
  });

  it('the app refuses to start with STORAGE_PROVIDER=cloudinary but no valid CLOUDINARY_URL', () => {
    const base = { GEMINI_API_KEY: 'k', GEMINI_MODEL: 'm', STORAGE_PROVIDER: 'cloudinary' };
    expect(() => loadEnv(base)).toThrow(/CLOUDINARY_URL/);
    expect(() => loadEnv({ ...base, CLOUDINARY_URL: 'cloudinary://broken' })).toThrow(/CLOUDINARY_URL/);
    expect(loadEnv({ ...base, CLOUDINARY_URL: 'cloudinary://k:s@c' }).STORAGE_PROVIDER).toBe('cloudinary');
    expect(loadEnv({ GEMINI_API_KEY: 'k', GEMINI_MODEL: 'm' }).STORAGE_PROVIDER).toBe('database');
  });
});

describe('listing photos through a storage provider', () => {
  it('stores the file at the provider, keeps only its key and redirects to the CDN', async () => {
    const { storage, files } = fakeCdnStorage();
    const app = createMarketTestApp({ photoStorage: storage });
    const seller = await readySeller(app);
    const upload = await seller.agent.post('/api/market/photos').attach('image', JPEG_BYTES, { filename: 'p.jpg', contentType: 'image/jpeg' });
    expect(upload.status).toBe(201);

    const record = await ListingPhotoModel.findById(upload.body.photoId).lean();
    expect(record).toMatchObject({ storageKey: 'agriai/p1', storage: 'cloudinary' });
    expect(record?.data).toBeUndefined();
    expect(files.size).toBe(1);

    const own = await seller.agent.get(`/api/market/photos/${upload.body.photoId}`);
    expect(own.status).toBe(302);
    expect(own.headers.location).toBe('https://cdn.example/agriai/p1');
    // Not attached to a listing yet: strangers do not even get the redirect.
    expect((await request(app).get(`/api/market/photos/${upload.body.photoId}`)).status).toBe(404);
  });

  it('photos saved in the database earlier still show, whatever the provider', async () => {
    const { storage } = fakeCdnStorage();
    const app = createMarketTestApp({ photoStorage: storage });
    const seller = await readySeller(app);
    const legacy = await ListingPhotoModel.create({ ownerId: seller.user.id, data: JPEG_BYTES, mimeType: 'image/jpeg' });
    const res = await seller.agent.get(`/api/market/photos/${legacy._id.toString()}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/jpeg');
  });
});

describe('removing unused uploads', () => {
  it('deletes old unattached photos at the provider and in MongoDB, keeps used and recent ones', async () => {
    const { storage, files } = fakeCdnStorage();
    const app = createMarketTestApp({ photoStorage: storage });
    const seller = await readySeller(app);
    const upload = async () =>
      (await seller.agent.post('/api/market/photos').attach('image', JPEG_BYTES, { filename: 'p.jpg', contentType: 'image/jpeg' })).body.photoId as string;
    const unused = await upload();
    const used = await upload();
    await ListingPhotoModel.updateOne({ _id: used }, { $set: { attached: true } });

    const later = new Date(Date.now() + 25 * 3_600_000);
    expect(await removeUnusedPhotos(storage, new Date())).toEqual({ removed: 0, failed: 0 });
    expect(await removeUnusedPhotos(storage, later)).toEqual({ removed: 1, failed: 0 });
    expect(await ListingPhotoModel.exists({ _id: unused })).toBeNull();
    expect(await ListingPhotoModel.exists({ _id: used })).not.toBeNull();
    expect([...files.keys()]).toEqual(['agriai/p2']);
  });

  it('keeps the record when the provider cannot delete the file, so the next run tries again', async () => {
    const { storage } = fakeCdnStorage();
    const app = createMarketTestApp({ photoStorage: storage });
    const seller = await readySeller(app);
    const res = await seller.agent.post('/api/market/photos').attach('image', JPEG_BYTES, { filename: 'p.jpg', contentType: 'image/jpeg' });
    vi.mocked(storage.remove).mockRejectedValueOnce(new Error('Cloudinary down'));
    const later = new Date(Date.now() + 25 * 3_600_000);
    expect(await removeUnusedPhotos(storage, later)).toEqual({ removed: 0, failed: 1 });
    expect(await ListingPhotoModel.exists({ _id: res.body.photoId })).not.toBeNull();
  });
});
