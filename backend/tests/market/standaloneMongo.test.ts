import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { ListingPhotoModel } from '../../src/modules/listings/listing.model.js';
import { JPEG_BYTES } from '../helpers.js';
import { createMarketTestApp, readySeller, registerAs } from './marketHelpers.js';

/**
 * Like a developer's local MongoDB without a replica set (no transactions).
 * Selling must still work; only accepting orders needs a replica set, and says so clearly.
 */
let server: MongoMemoryServer;

beforeAll(async () => {
  server = await MongoMemoryServer.create();
  mongoose.set('bufferCommands', false);
  await mongoose.connect(server.getUri(), { dbName: 'agriai_test_standalone' });
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
});

afterAll(async () => {
  await mongoose.disconnect();
  await server.stop();
});

describe('MongoDB without a replica set', () => {
  it('a seller can still list a product with its photo', async () => {
    const app = createMarketTestApp();
    const { agent } = await readySeller(app);
    const photoId = (await agent.post('/api/market/photos').attach('image', JPEG_BYTES, { filename: 'p.jpg', contentType: 'image/jpeg' })).body.photoId;

    const res = await agent
      .post('/api/market/listings')
      .send({ category: 'crop', product: 'bajra', unit: 'quintal', quantity: 10, pricePerUnitPaise: 2500_00, title: { hi: 'बाजरा' }, photoIds: [photoId] });
    expect(res.status).toBe(201);
    expect(await ListingPhotoModel.findById(photoId).lean()).toMatchObject({ attached: true });
  });

  it('a failed listing gives its photo back (no half-saved state)', async () => {
    const app = createMarketTestApp();
    const { agent } = await readySeller(app);
    const good = (await agent.post('/api/market/photos').attach('image', JPEG_BYTES, { filename: 'p.jpg', contentType: 'image/jpeg' })).body.photoId;
    const other = await readySeller(app);
    const notMine = (await other.agent.post('/api/market/photos').attach('image', JPEG_BYTES, { filename: 'p.jpg', contentType: 'image/jpeg' })).body.photoId;

    const res = await agent
      .post('/api/market/listings')
      .send({ category: 'crop', product: 'bajra', unit: 'quintal', quantity: 10, pricePerUnitPaise: 2500_00, title: { hi: 'बाजरा' }, photoIds: [good, notMine] });
    expect(res.body.error.code).toBe('INVALID_INPUT');
    expect(await ListingPhotoModel.findById(good).lean()).toMatchObject({ attached: false });
    expect((await ListingPhotoModel.findById(good).lean())?.listingId).toBeUndefined();
  });

  it('placing or accepting an order explains that a replica set is needed', async () => {
    const app = createMarketTestApp();
    const seller = await readySeller(app);
    const listingId = (await seller.agent
      .post('/api/market/listings')
      .send({ category: 'crop', product: 'bajra', unit: 'quintal', quantity: 10, pricePerUnitPaise: 2500_00, title: { hi: 'बाजरा' } })).body.listing.id;
    const buyer = await registerAs(app, 'buyer');
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const res = await buyer.agent.post('/api/market/orders').send({ listingId, quantity: 1, fulfilment: 'pickup', paymentMethod: 'upi' });
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ error: { code: 'NEEDS_REPLICA_SET' } });
  });
});
