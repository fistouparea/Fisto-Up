import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { flagDefaults, type FlagKey, type FlagState } from '../../src/config/featureFlags.js';
import { AuditLogModel } from '../../src/modules/audit/audit.model.js';
import { UserModel } from '../../src/modules/auth/user.model.js';
import { DiagnosisFeedbackModel } from '../../src/modules/feedback/feedback.model.js';
import { FeatureFlags } from '../../src/modules/flags/flag.service.js';
import { HelpRequestModel } from '../../src/modules/help/help.model.js';
import { InviteCodeModel } from '../../src/modules/invites/invite.model.js';
import { MongoHistoryRepository } from '../../src/services/history/mongoHistoryRepository.js';
import { JPEG_BYTES } from '../helpers.js';
import { useTestDatabase } from '../setup/testDatabase.js';
import { client, createMarketTestApp, loginCoordinator, nextPhone, registerAs } from './marketHelpers.js';

useTestDatabase();

type App = ReturnType<typeof createMarketTestApp>;

function appWith(overrides: Partial<Record<FlagKey, FlagState>> = {}) {
  const flags = new FeatureFlags({ ...flagDefaults(undefined), ...overrides });
  return createMarketTestApp({}, { flags, historyRepository: new MongoHistoryRepository() });
}

async function invite(app: App, body: Record<string, unknown> = {}) {
  const coordinator = await loginCoordinator(app);
  const res = await coordinator.agent.post('/api/admin/invites').send(body);
  if (res.status !== 201) throw new Error(`invite failed ${res.status}`);
  return { code: res.body.invite.code as string, id: res.body.invite.id as string, coordinator };
}

function signUp(app: App, extra: Record<string, unknown> = {}) {
  return client(app).post('/api/auth/register').send({ phone: nextPhone(), pin: '4826', name: 'किसान', role: 'seller', ...extra });
}

describe('invite-only sign-up (pilot)', () => {
  it('needs a valid code while inviteOnly is on; the code makes it a pilot account', async () => {
    const app = appWith({ inviteOnly: 'all' });
    const without = await signUp(app);
    expect(without.status).toBe(403);
    expect(without.body.error.code).toBe('INVITE_REQUIRED');

    const { code } = await invite(app);
    // People type codes in many ways: lower case, spaces, dashes.
    const typed = `${code.slice(0, 3).toLowerCase()}-${code.slice(3)}`;
    const ok = await signUp(app, { inviteCode: typed });
    expect(ok.status).toBe(201);
    expect(await UserModel.findById(ok.body.user.id).lean()).toMatchObject({ pilot: true });
  });

  it('a code works only as often as allowed, never after it expired or was revoked, and only for its role', async () => {
    const app = appWith({ inviteOnly: 'all' });
    const single = await invite(app, { maxUses: 1 });
    expect((await signUp(app, { inviteCode: single.code })).status).toBe(201);
    expect((await signUp(app, { inviteCode: single.code })).body.error.code).toBe('INVALID_INVITE');

    const buyersOnly = await invite(app, { maxUses: 5, role: 'buyer' });
    expect((await signUp(app, { inviteCode: buyersOnly.code, role: 'seller' })).status).toBe(400);
    expect((await signUp(app, { inviteCode: buyersOnly.code, role: 'buyer' })).status).toBe(201);

    await buyersOnly.coordinator.agent.post(`/api/admin/invites/${buyersOnly.id}/revoke`).send({});
    expect((await signUp(app, { inviteCode: buyersOnly.code, role: 'buyer' })).status).toBe(400);

    const old = await invite(app, { maxUses: 5, expiresInDays: 1 });
    await InviteCodeModel.updateOne({ _id: old.id }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await signUp(app, { inviteCode: old.code })).status).toBe(400);
    expect((await signUp(app, { inviteCode: 'NOTREAL' })).status).toBe(400);
  });

  it('two people racing for the last use: exactly one gets it', async () => {
    const app = appWith({ inviteOnly: 'all' });
    const { code, id } = await invite(app, { maxUses: 1 });
    const results = await Promise.all([signUp(app, { inviteCode: code }), signUp(app, { inviteCode: code })]);
    expect(results.map((res) => res.status).sort()).toEqual([201, 400]);
    expect(await InviteCodeModel.findById(id).lean()).toMatchObject({ uses: 1 });
  });

  it('gives the use back when the phone number was already registered', async () => {
    const app = appWith({ inviteOnly: 'all' });
    const { code, id } = await invite(app, { maxUses: 1 });
    const phone = nextPhone();
    await UserModel.create({ phone, pinHash: 'x', role: 'buyer', name: 'पहले से' });
    expect((await signUp(app, { phone, inviteCode: code })).body.error.code).toBe('PHONE_TAKEN');
    expect(await InviteCodeModel.findById(id).lean()).toMatchObject({ uses: 0 });
  });

  it('a coordinator turns invite-only on in the panel; the change is audited', async () => {
    const app = appWith({ inviteOnly: 'off' });
    expect((await signUp(app)).status).toBe(201);
    const coordinator = await loginCoordinator(app);
    const res = await coordinator.agent.put('/api/admin/flags/inviteOnly').send({ state: 'all' });
    expect(res.body.items.find((flag: { key: string }) => flag.key === 'inviteOnly')).toMatchObject({ state: 'all', default: 'off' });
    expect((await signUp(app)).status).toBe(403);
    expect(await AuditLogModel.countDocuments({ action: 'flag.set', 'target.id': 'inviteOnly' })).toBe(1);

    expect((await coordinator.agent.put('/api/admin/flags/unknownFlag').send({ state: 'all' })).status).toBe(400);
    expect((await client(app).put('/api/admin/flags/inviteOnly').send({ state: 'off' })).status).toBe(401);
  });
});

describe('feature flags for pilot users first', () => {
  it('"pilot" features show for pilot accounts and coordinators, not for others; "all" for everyone', async () => {
    const app = appWith({ voiceInput: 'pilot', aiFeedback: 'all', helpRequests: 'off' });
    const anonymous = (await request(app).get('/api/account/flags')).body.flags;
    expect(anonymous).toMatchObject({ voiceInput: false, aiFeedback: true, helpRequests: false });

    const normal = await registerAs(app, 'buyer');
    expect((await normal.agent.get('/api/account/flags')).body.flags.voiceInput).toBe(false);

    const { code } = await invite(app);
    const pilot = client(app);
    await pilot.post('/api/auth/register').send({ phone: nextPhone(), pin: '4826', name: 'पायलट', role: 'buyer', inviteCode: code });
    expect((await pilot.get('/api/account/flags')).body.flags.voiceInput).toBe(true);
    expect((await (await loginCoordinator(app)).agent.get('/api/account/flags')).body.flags.voiceInput).toBe(true);
  });
});

async function diagnosedPhone(app: App) {
  const deviceId = randomUUID();
  const res = await request(app)
    .post('/api/diagnose')
    .field('crop', 'bajra')
    .field('deviceId', deviceId)
    .attach('image', JPEG_BYTES, { filename: 'p.jpg', contentType: 'image/jpeg' });
  return { deviceId, historyId: res.body.historyId as string };
}

describe('"क्या जवाब सही था?" after a diagnosis', () => {
  it('stores 👍/👎 with an optional comment, linked to the diagnosis; the farmer can change it', async () => {
    const app = appWith();
    const { deviceId, historyId } = await diagnosedPhone(app);
    expect(historyId).toMatch(/^[0-9a-f]{24}$/);

    expect((await request(app).post(`/api/history/${historyId}/feedback`).send({ deviceId, helpful: false, comment: 'दवाई से फर्क नहीं पड़ा' })).status).toBe(200);
    expect(await DiagnosisFeedbackModel.findOne({ diagnosisId: historyId }).lean()).toMatchObject({ helpful: false, crop: 'bajra', comment: 'दवाई से फर्क नहीं पड़ा' });

    await request(app).post(`/api/history/${historyId}/feedback`).send({ deviceId, helpful: true });
    const changed = await DiagnosisFeedbackModel.find({ diagnosisId: historyId }).lean();
    expect(changed).toHaveLength(1);
    expect(changed[0]).toMatchObject({ helpful: true });
    expect(changed[0]).not.toHaveProperty('comment');
  });

  it("another phone cannot answer for someone else's diagnosis; invalid answers are refused", async () => {
    const app = appWith();
    const { deviceId, historyId } = await diagnosedPhone(app);
    expect((await request(app).post(`/api/history/${historyId}/feedback`).send({ deviceId: randomUUID(), helpful: true })).status).toBe(404);
    expect((await request(app).post(`/api/history/${historyId}/feedback`).send({ deviceId, helpful: 'yes' })).status).toBe(400);
    expect(await DiagnosisFeedbackModel.countDocuments()).toBe(0);
  });

  it('is refused when the aiFeedback flag is off, and goes with "मेरा डेटा मिटाएँ"', async () => {
    const off = appWith({ aiFeedback: 'off' });
    const first = await diagnosedPhone(off);
    expect((await request(off).post(`/api/history/${first.historyId}/feedback`).send({ deviceId: first.deviceId, helpful: true })).status).toBe(403);

    const app = appWith();
    const { deviceId, historyId } = await diagnosedPhone(app);
    await request(app).post(`/api/history/${historyId}/feedback`).send({ deviceId, helpful: true });
    const exported = await request(app).get('/api/account/my-data').query({ deviceId });
    expect(exported.body.device.aiFeedback).toHaveLength(1);
    await client(app).post('/api/account/my-data/delete').send({ deviceId, confirm: 'DELETE' });
    expect(await DiagnosisFeedbackModel.countDocuments()).toBe(0);
  });
});

describe('मदद/शिकायत', () => {
  it('anyone can send a request; coordinators see it with a phone to call back, and close it (audited)', async () => {
    const app = appWith();
    const deviceId = randomUUID();
    const sent = await client(app).post('/api/account/help').send({ deviceId, category: 'crop', message: 'पत्ते पीले हो रहे हैं', callbackPhone: '98290 12345' });
    expect(sent.status).toBe(201);
    const buyer = await registerAs(app, 'buyer');
    await buyer.agent.post('/api/account/help').send({ deviceId: randomUUID(), category: 'payment', message: 'पैसा कट गया पर ऑर्डर नहीं हुआ' });

    const coordinator = await loginCoordinator(app);
    const list = await coordinator.agent.get('/api/admin/help');
    expect(list.body.items).toHaveLength(2);
    expect(list.body.items[0]).toMatchObject({ category: 'payment', from: { role: 'buyer' }, phone: buyer.phone });
    expect(list.body.items[1]).toMatchObject({ category: 'crop', from: null, phone: '9829012345' });

    await coordinator.agent.post(`/api/admin/help/${sent.body.id}/resolve`).send({ resolution: 'फोन पर बात की' });
    expect((await coordinator.agent.get('/api/admin/help')).body.items).toHaveLength(1);
    expect(await AuditLogModel.countDocuments({ action: 'help.resolve' })).toBe(1);
    expect((await buyer.agent.get('/api/admin/help')).status).toBe(403);
  });

  it('refuses empty messages, unknown categories, and everything when the flag is off', async () => {
    const app = appWith();
    const deviceId = randomUUID();
    expect((await client(app).post('/api/account/help').send({ deviceId, category: 'crop', message: '' })).status).toBe(400);
    expect((await client(app).post('/api/account/help').send({ deviceId, category: 'x', message: 'मदद चाहिए' })).status).toBe(400);
    const off = appWith({ helpRequests: 'off' });
    expect((await client(off).post('/api/account/help').send({ deviceId, category: 'crop', message: 'मदद चाहिए' })).status).toBe(403);
    expect(await HelpRequestModel.countDocuments()).toBe(0);
  });
});
