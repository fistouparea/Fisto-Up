import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { CONSENT_VERSION, DELETED_NAME } from '../../src/config/privacy.js';
import { DiagnosisRecord } from '../../src/models/DiagnosisRecord.js';
import { FarmProfileModel } from '../../src/models/FarmProfile.js';
import { UserModel } from '../../src/modules/auth/user.model.js';
import { ListingModel, ListingPhotoModel } from '../../src/modules/listings/listing.model.js';
import { OrderModel } from '../../src/modules/orders/order.model.js';
import { ConsentModel, DeletionLogModel } from '../../src/modules/privacy/privacy.model.js';
import { MongoFarmProfileRepository } from '../../src/services/farm/mongoFarmProfileRepository.js';
import { MongoHistoryRepository } from '../../src/services/history/mongoHistoryRepository.js';
import { JPEG_BYTES } from '../helpers.js';
import { useTestDatabase } from '../setup/testDatabase.js';
import { client, createMarketTestApp, loginCoordinator, readySeller, registerAs } from './marketHelpers.js';

useTestDatabase();

type App = ReturnType<typeof createMarketTestApp>;

function appWithStorage() {
  return createMarketTestApp({}, { historyRepository: new MongoHistoryRepository(), farmProfiles: new MongoFarmProfileRepository() });
}

/** A farmer who used the advisor on this phone: consent, farm profile and one saved diagnosis. */
async function farmerDevice(app: App) {
  const deviceId = randomUUID();
  const agent = client(app);
  await agent.post('/api/consent').send({ deviceId, version: CONSENT_VERSION });
  await agent.put('/api/profile').send({ deviceId, profile: { crops: [{ crop: 'bajra', sowingDate: '2026-07-01' }], fieldSizeBigha: 5 } });
  await agent.post('/api/diagnose').field('crop', 'bajra').field('deviceId', deviceId).attach('image', JPEG_BYTES, { filename: 'p.jpg', contentType: 'image/jpeg' });
  return { deviceId, agent };
}

const listingBody = { category: 'crop', product: 'bajra', unit: 'quintal', quantity: 20, pricePerUnitPaise: 2500_00, title: { hi: 'बाजरा' } };

describe('consent', () => {
  it('records the accepted version with a timestamp and tells the app when the text changed', async () => {
    const app = appWithStorage();
    const deviceId = randomUUID();
    expect((await request(app).get('/api/consent').query({ deviceId })).body).toEqual({ consent: null, currentVersion: CONSENT_VERSION });

    const saved = await request(app).post('/api/consent').send({ deviceId, version: CONSENT_VERSION, lang: 'hi' });
    expect(saved.status).toBe(201);
    const latest = await request(app).get('/api/consent').query({ deviceId });
    expect(latest.body.consent).toMatchObject({ version: CONSENT_VERSION, current: true });
    expect(new Date(latest.body.consent.acceptedAt).getTime()).toBeGreaterThan(Date.now() - 60_000);

    await ConsentModel.updateMany({ deviceId }, { $set: { version: 'old-text' } });
    expect((await request(app).get('/api/consent').query({ deviceId })).body.consent.current).toBe(false);
  });

  it('refuses an outdated version or a missing device id', async () => {
    const app = appWithStorage();
    expect((await request(app).post('/api/consent').send({ deviceId: randomUUID(), version: 'old' })).status).toBe(400);
    expect((await request(app).post('/api/consent').send({ version: CONSENT_VERSION })).status).toBe(400);
  });
});

describe('मेरा डेटा: download', () => {
  it('gives a farmer without an account everything stored about this phone, and nothing of other phones', async () => {
    const app = appWithStorage();
    const mine = await farmerDevice(app);
    await farmerDevice(app);

    const res = await request(app).get('/api/account/my-data').query({ deviceId: mine.deviceId });
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toContain('attachment');
    expect(res.body.device.farmProfile).toMatchObject({ fieldSizeBigha: 5 });
    expect(res.body.device.diagnoses).toHaveLength(1);
    expect(res.body.device.consents).toHaveLength(1);
    expect(res.body.account).toBeNull();
  });

  it('adds the account for a logged-in seller, without the PIN hash or session data', async () => {
    const app = appWithStorage();
    const seller = await readySeller(app);
    await seller.agent.post('/api/market/listings').send(listingBody);
    const res = await seller.agent.get('/api/account/my-data').query({ deviceId: randomUUID() });
    expect(res.body.account).toMatchObject({ phone: seller.phone, role: 'seller', seller: { upiId: 'sunita@okaxis' } });
    expect(res.body.account.listings).toHaveLength(1);
    const raw = JSON.stringify(res.body);
    expect(raw).not.toMatch(/pinHash|tokenVersion|\$2[aby]\$/);
  });
});

describe('मेरा डेटा: delete', () => {
  it('needs the explicit confirmation word', async () => {
    const app = appWithStorage();
    const { deviceId, agent } = await farmerDevice(app);
    expect((await agent.post('/api/account/my-data/delete').send({ deviceId })).status).toBe(400);
    expect(await DiagnosisRecord.countDocuments({ deviceId })).toBe(1);
  });

  it("deletes a farmer's phone data completely and leaves other phones alone", async () => {
    const app = appWithStorage();
    const mine = await farmerDevice(app);
    const other = await farmerDevice(app);

    const res = await mine.agent.post('/api/account/my-data/delete').send({ deviceId: mine.deviceId, confirm: 'DELETE' });
    expect(res.status).toBe(200);
    expect(res.body.device).toMatchObject({ farmProfiles: 1, diagnoses: 1, consents: 1 });
    const counts = async (deviceId: string) => [
      await DiagnosisRecord.countDocuments({ deviceId }),
      await FarmProfileModel.countDocuments({ deviceId }),
      await ConsentModel.countDocuments({ deviceId }),
    ];
    expect(await counts(mine.deviceId)).toEqual([0, 0, 0]);
    expect(await counts(other.deviceId)).toEqual([1, 1, 1]);
    // The deletion itself is logged, without saying whose data it was.
    const log = await DeletionLogModel.findOne().lean();
    expect(log).toMatchObject({ scope: 'device' });
    expect(JSON.stringify(log)).not.toContain(mine.deviceId);
  });

  it('a buyer account is emptied, logged out, and its finished orders stay for records without name, village or address', async () => {
    const app = appWithStorage();
    const seller = await readySeller(app);
    const listingId = (await seller.agent.post('/api/market/listings').send(listingBody)).body.listing.id as string;
    const buyer = await registerAs(app, 'buyer');
    await buyer.agent.put('/api/account/buyer-profile').send({ name: 'रमेश जी', buyerType: 'household', village: 'सरदारशहर', address: 'वार्ड 5' });
    const orderId = (
      await buyer.agent.post('/api/market/orders').send({ listingId, quantity: 2, fulfilment: 'delivery', deliveryAddress: 'वार्ड 5, सरदारशहर', paymentMethod: 'cash', note: 'शाम को' })
    ).body.order.id as string;

    // A running order blocks deletion: the seller is waiting for this buyer.
    const blocked = await buyer.agent.post('/api/account/my-data/delete').send({ deviceId: randomUUID(), confirm: 'DELETE' });
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.code).toBe('ACTIVE_ORDERS');

    await buyer.agent.post(`/api/market/orders/${orderId}/status`).send({ to: 'cancelled' });
    const res = await buyer.agent.post('/api/account/my-data/delete').send({ deviceId: randomUUID(), confirm: 'DELETE' });
    expect(res.status).toBe(200);
    expect(res.body.account).toMatchObject({ ordersAnonymized: 1 });

    const order = await OrderModel.findById(orderId).lean();
    expect(order?.buyer.name).toBe(DELETED_NAME);
    expect(order).not.toHaveProperty('deliveryAddress');
    expect(order).not.toHaveProperty('note');
    expect(order?.totalPaise).toBe(2 * 2500_00);

    const account = await UserModel.findById(buyer.user.id).lean();
    expect(account).toMatchObject({ name: DELETED_NAME });
    expect(account?.phone).not.toBe(buyer.phone);
    expect(account?.buyer).toBeUndefined();
    expect(account?.deletedAt).toBeInstanceOf(Date);

    // The old session no longer works, the phone number can be registered again, and the old PIN does not log in.
    expect((await buyer.agent.get('/api/auth/me')).body.user).toBeNull();
    expect((await client(app).post('/api/auth/login').send({ phone: buyer.phone, pin: '4826' })).status).toBe(401);
    const again = await client(app).post('/api/auth/register').send({ phone: buyer.phone, pin: '4826', name: 'नया खाता', role: 'buyer' });
    expect(again.status).toBe(201);
  });

  it("a seller's listings leave the market and their photos are removed", async () => {
    const app = appWithStorage();
    const seller = await readySeller(app);
    const photoId = (await seller.agent.post('/api/market/photos').attach('image', JPEG_BYTES, { filename: 'p.jpg', contentType: 'image/jpeg' })).body.photoId as string;
    const listingId = (await seller.agent.post('/api/market/listings').send({ ...listingBody, photoIds: [photoId] })).body.listing.id as string;

    expect((await seller.agent.post('/api/account/my-data/delete').send({ deviceId: randomUUID(), confirm: 'DELETE' })).status).toBe(200);
    expect(await ListingPhotoModel.countDocuments()).toBe(0);
    expect(await ListingModel.findById(listingId).lean()).toMatchObject({ hidden: true, status: 'paused', photoIds: [] });
    expect((await request(app).get(`/api/market/listings/${listingId}`)).status).toBe(404);

    const coordinator = await loginCoordinator(app);
    expect((await coordinator.agent.get('/api/admin/sellers')).body.items).toEqual([]);
  });

  it('coordinator accounts cannot delete themselves in the app', async () => {
    const app = appWithStorage();
    const coordinator = await loginCoordinator(app);
    expect((await coordinator.agent.post('/api/account/my-data/delete').send({ deviceId: randomUUID(), confirm: 'DELETE' })).status).toBe(403);
  });
});
