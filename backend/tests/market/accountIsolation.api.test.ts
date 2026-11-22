import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { DiagnosisRecord } from '../../src/models/DiagnosisRecord.js';
import { FarmProfileModel } from '../../src/models/FarmProfile.js';
import { PushSubscriptionModel } from '../../src/models/PushSubscription.js';
import { UserModel } from '../../src/modules/auth/user.model.js';
import { ListingPhotoModel } from '../../src/modules/listings/listing.model.js';
import { HelpRequestModel } from '../../src/modules/help/help.model.js';
import { MongoFarmProfileRepository } from '../../src/services/farm/mongoFarmProfileRepository.js';
import { MongoHistoryRepository } from '../../src/services/history/mongoHistoryRepository.js';
import { JPEG_BYTES } from '../helpers.js';
import { useTestDatabase } from '../setup/testDatabase.js';
import { client, createMarketTestApp, loginCoordinator, registerAs } from './marketHelpers.js';

useTestDatabase();

type App = ReturnType<typeof createMarketTestApp>;

const appWithStorage = () => createMarketTestApp({}, { historyRepository: new MongoHistoryRepository(), farmProfiles: new MongoFarmProfileRepository() });
const profile = { crops: [{ crop: 'bajra', sowingDate: '2026-07-01' }], fieldSizeBigha: 5 };

/** Farmer A with a farm and one saved check, all linked to their account. */
async function farmerA(app: App) {
  const deviceId = randomUUID();
  const account = await registerAs(app, 'buyer', { deviceId });
  expect((await account.agent.put('/api/profile').send({ deviceId, profile })).status).toBe(200);
  const checked = await account.agent.post('/api/diagnose').field('crop', 'bajra').field('deviceId', deviceId).attach('image', JPEG_BYTES, { filename: 'p.jpg', contentType: 'image/jpeg' });
  expect(checked.body.historyId).toBeTruthy();
  return { ...account, deviceId, historyId: checked.body.historyId as string };
}

describe('one phone, several accounts', () => {
  it('signing up on the phone of another account never links that account data', async () => {
    const app = appWithStorage();
    const a = await farmerA(app);
    await a.agent.post('/api/auth/logout').send({});

    const b = await registerAs(app, 'seller', { deviceId: a.deviceId });
    const own = (await b.agent.get('/api/auth/me')).body.user.deviceId as string;
    expect(own).not.toBe(a.deviceId);
    expect((await b.agent.get('/api/profile').query({ deviceId: own })).body.profile).toBeNull();
    expect((await b.agent.get('/api/history').query({ deviceId: own })).body.items).toEqual([]);
  });

  it('the first login of an existing account on that phone gets its own id', async () => {
    const app = appWithStorage();
    const a = await farmerA(app);
    const b = await registerAs(app, 'seller');
    await UserModel.updateOne({ _id: b.user.id }, { $unset: { deviceId: 1 } });

    const res = await client(app).post('/api/auth/login').send({ phone: b.phone, pin: '4826', deviceId: a.deviceId });
    expect(res.status).toBe(200);
    expect(res.body.user.deviceId).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.body.user.deviceId).not.toBe(a.deviceId);
  });

  it('a coordinator never takes over the farm data of the phone they log in on', async () => {
    const app = appWithStorage();
    const coordinator = await loginCoordinator(app);
    const { phone } = (await UserModel.findById(coordinator.id).lean()) ?? { phone: '' };
    await UserModel.updateOne({ _id: coordinator.id }, { $unset: { deviceId: 1 } });
    const guest = randomUUID();
    const res = await client(app).post('/api/auth/login').send({ phone, pin: '7391', deviceId: guest });
    expect(res.body.user.deviceId).not.toBe(guest);
  });
});

describe('the server refuses the data id of another account', () => {
  const READS = ['profile', 'history', 'history/:id', 'dashboard', 'weather', 'water', 'calendar', 'notifications', 'mandi', 'schemes', 'consent', 'account/my-data'];

  it.each(READS)('GET /api/%s: neither a guest, nor another account, nor a coordinator', async (path) => {
    const app = appWithStorage();
    const a = await farmerA(app);
    const url = `/api/${path.replace(':id', a.historyId)}`;
    const others = [client(app), (await registerAs(app, 'seller')).agent, (await loginCoordinator(app)).agent];
    for (const other of others) expect((await other.get(url).query({ deviceId: a.deviceId })).status).toBe(403);
  });

  const WRITES: [string, 'put' | 'post', Record<string, unknown>][] = [
    ['profile', 'put', { profile }],
    ['profile/watered', 'post', { crop: 'bajra' }],
    ['history/:id/follow-up', 'post', { answer: 'yes' }],
    ['history/:id/feedback', 'post', { helpful: true }],
    ['push/subscribe', 'post', {}],
    ['market/push/subscribe', 'post', {}],
    ['events', 'post', { name: 'app_open' }],
    ['consent', 'post', {}],
    ['account/help', 'post', { category: 'other', message: 'मदद चाहिए' }],
    ['account/my-data/delete', 'post', { confirm: 'DELETE' }],
  ];

  it.each(WRITES)('writing /api/%s', async (path, method, body) => {
    const app = appWithStorage();
    const a = await farmerA(app);
    const b = await registerAs(app, 'seller');
    const url = `/api/${path.replace(':id', a.historyId)}`;
    for (const other of [client(app), b.agent]) expect((await other[method](url).send({ ...body, deviceId: a.deviceId })).status).toBe(403);
    expect(await FarmProfileModel.countDocuments({ deviceId: a.deviceId })).toBe(1);
    expect(await DiagnosisRecord.countDocuments({ deviceId: a.deviceId })).toBe(1);
  });

  it('a photo check still answers, but is not saved into the other account', async () => {
    const app = appWithStorage();
    const a = await farmerA(app);
    const res = await client(app).post('/api/diagnose').field('crop', 'bajra').field('deviceId', a.deviceId).attach('image', JPEG_BYTES, { filename: 'p.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(200);
    expect(res.body.historyId).toBeUndefined();
    expect(await DiagnosisRecord.countDocuments({ deviceId: a.deviceId })).toBe(1);
  });

  it('the owner and a guest on an unclaimed phone keep working', async () => {
    const app = appWithStorage();
    const a = await farmerA(app);
    expect((await a.agent.get('/api/profile').query({ deviceId: a.deviceId })).body.profile).toMatchObject({ fieldSizeBigha: 5 });
    const deviceId = randomUUID();
    expect((await client(app).put('/api/profile').send({ deviceId, profile })).status).toBe(200);
  });

  it('a logged-out phone is told to take a new id', async () => {
    const app = appWithStorage();
    const a = await farmerA(app);
    expect((await client(app).get('/api/auth/me').query({ deviceId: a.deviceId })).body).toEqual({ user: null, resetDevice: true });
    expect((await client(app).get('/api/auth/me').query({ deviceId: randomUUID() })).body).toEqual({ user: null });
  });

  it('API answers are never stored by a browser or proxy', async () => {
    const app = appWithStorage();
    const a = await farmerA(app);
    for (const path of ['/api/auth/me', '/api/market/orders', '/api/market/notifications']) {
      expect((await a.agent.get(path)).headers['cache-control']).toBe('no-store');
    }
  });
});

describe('accounts that were already mixed up before the fix', () => {
  /** The old bug: two accounts with the same data id. */
  async function mixed(app: App) {
    const a = await farmerA(app);
    const b = await registerAs(app, 'seller');
    await UserModel.updateOne({ _id: b.user.id }, { $set: { deviceId: a.deviceId } });
    return { a, b };
  }

  it('both get separate ids, whoever comes first; the mixed data is kept but shown to neither', async () => {
    const app = appWithStorage();
    const { a, b } = await mixed(app);
    const idB = (await b.agent.get('/api/auth/me')).body.user.deviceId as string;
    const idA = (await a.agent.get('/api/auth/me')).body.user.deviceId as string;
    expect(new Set([idA, idB, a.deviceId]).size).toBe(3);
    for (const agent of [a.agent, b.agent]) expect((await agent.get('/api/profile').query({ deviceId: a.deviceId })).status).toBe(403);
    expect(await FarmProfileModel.countDocuments({ deviceId: a.deviceId })).toBe(1);
    expect((await UserModel.findById(b.user.id).lean())?.sharedDeviceId).toBe(a.deviceId);
  });

  it('"मेरा डेटा" of one account neither shows nor deletes the mixed data', async () => {
    const app = appWithStorage();
    const { a, b } = await mixed(app);
    const exported = await b.agent.get('/api/account/my-data').query({ deviceId: randomUUID() });
    expect(exported.body.device.farmProfile).toBeNull();
    expect(exported.body.device.diagnoses).toEqual([]);

    expect((await b.agent.post('/api/account/my-data/delete').send({ deviceId: randomUUID(), confirm: 'DELETE' })).status).toBe(200);
    expect(await FarmProfileModel.countDocuments({ deviceId: a.deviceId })).toBe(1);
    expect(await DiagnosisRecord.countDocuments({ deviceId: a.deviceId })).toBe(1);
  });
});

describe('shared phone leftovers', () => {
  it('complaint photos stay out of the browser cache; listing photos may be cached', async () => {
    const app = appWithStorage();
    const coordinator = await loginCoordinator(app);
    const base = { ownerId: coordinator.id, data: JPEG_BYTES, mimeType: 'image/jpeg', attached: true };
    const secret = await ListingPhotoModel.create({ ...base, complaintId: coordinator.id });
    const open = await ListingPhotoModel.create(base);
    expect((await coordinator.agent.get(`/api/market/photos/${secret._id.toString()}`)).headers['cache-control']).toBe('private, no-store');
    expect((await coordinator.agent.get(`/api/market/photos/${open._id.toString()}`)).headers['cache-control']).toMatch(/^public/);
  });

  it("a help request of one account is not in another account's export or deletion", async () => {
    const app = appWithStorage();
    const a = await registerAs(app, 'buyer');
    const b = await registerAs(app, 'seller');
    const deviceId = randomUUID();
    await HelpRequestModel.create({ deviceId, userId: a.user.id, userRole: 'buyer', category: 'other', message: 'A का निजी संदेश' });
    expect(JSON.stringify((await b.agent.get('/api/account/my-data').query({ deviceId })).body)).not.toContain('A का निजी संदेश');
    await b.agent.post('/api/account/my-data/delete').send({ deviceId, confirm: 'DELETE' });
    expect(await HelpRequestModel.countDocuments({ userId: a.user.id })).toBe(1);
  });

  it('logout stops the farm alerts of that account on this phone', async () => {
    const app = appWithStorage();
    const a = await farmerA(app);
    const endpoint = 'https://push.example.com/farmer-a';
    await PushSubscriptionModel.create({ endpoint, deviceId: a.deviceId, keys: { p256dh: 'key', auth: 'auth' } });
    await a.agent.post('/api/auth/logout').send({ pushEndpoint: endpoint });
    expect(await PushSubscriptionModel.countDocuments({ endpoint })).toBe(0);
  });
});
