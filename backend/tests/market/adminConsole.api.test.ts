import { describe, expect, it } from 'vitest';
import { AuditLogModel } from '../../src/modules/audit/audit.model.js';
import { UserModel } from '../../src/modules/auth/user.model.js';
import { FeatureFlagModel } from '../../src/modules/flags/flag.model.js';
import { useTestDatabase } from '../setup/testDatabase.js';
import { client, createMarketTestApp, loginCoordinator, readySeller, registerAs } from './marketHelpers.js';

useTestDatabase();

describe('admin control centre', () => {
  it.each([
    ['get', '/api/admin/attention'],
    ['get', '/api/admin/users'],
    ['post', '/api/admin/users/000000000000000000000001/end-sessions'],
    ['post', '/api/admin/users/000000000000000000000001/unlock'],
  ] as const)('%s %s is only for coordinators', async (method, url) => {
    const app = createMarketTestApp();
    expect((await client(app)[method](url)).status).toBe(401);
    for (const role of ['buyer', 'seller'] as const) expect((await (await registerAs(app, role)).agent[method](url)).status).toBe(403);
  });

  it('counts the waiting work and warns about demo coordinator accounts', async () => {
    const app = createMarketTestApp();
    const coordinator = await loginCoordinator(app);
    await readySeller(app, { verified: false });
    expect((await coordinator.agent.get('/api/admin/attention')).body).toMatchObject({
      pendingSellers: 1, newOrders: 0, complaints: 0, helpRequests: 0, duePaise: 0, sellersNeedingUpi: 0, demoCoordinators: 0,
    });
    await UserModel.updateOne({ _id: coordinator.id }, { $set: { demo: true } });
    expect((await coordinator.agent.get('/api/admin/attention')).body.demoCoordinators).toBe(1);
  });

  it('finds accounts by role, name, phone or village, without secrets', async () => {
    const app = createMarketTestApp();
    const coordinator = await loginCoordinator(app);
    const seller = await readySeller(app);
    const buyer = await registerAs(app, 'buyer');

    const sellers = await coordinator.agent.get('/api/admin/users').query({ role: 'seller' });
    expect(sellers.body.items).toHaveLength(1);
    expect(sellers.body.items[0]).toMatchObject({ id: seller.user.id, village: 'घांघू', sellerStatus: 'verified' });
    expect((await coordinator.agent.get('/api/admin/users').query({ q: buyer.phone })).body.items).toHaveLength(1);
    expect((await coordinator.agent.get('/api/admin/users').query({ q: 'घांघू' })).body.total).toBe(1);
    expect((await coordinator.agent.get('/api/admin/users').query({ q: '.*' })).body.total).toBe(0);
    expect(JSON.stringify((await coordinator.agent.get('/api/admin/users')).body)).not.toMatch(/pinHash|deviceId|tokenVersion|\$2[aby]\$/);
  });

  it('ends all logins of an account, audited', async () => {
    const app = createMarketTestApp();
    const coordinator = await loginCoordinator(app);
    const buyer = await registerAs(app, 'buyer');
    expect((await coordinator.agent.post(`/api/admin/users/${buyer.user.id}/end-sessions`)).status).toBe(200);
    expect((await buyer.agent.get('/api/auth/me')).body.user).toBeNull();
    expect(await AuditLogModel.countDocuments({ action: 'user.endSessions', 'target.id': buyer.user.id })).toBe(1);
  });

  it('unlocks an account locked by wrong PINs, audited', async () => {
    const app = createMarketTestApp();
    const coordinator = await loginCoordinator(app);
    const buyer = await registerAs(app, 'buyer');
    const login = (pin: string) => client(app).post('/api/auth/login').send({ phone: buyer.phone, pin });
    for (let attempt = 0; attempt < 5; attempt++) await login('9753');
    expect((await login('4826')).status).toBe(429);
    expect((await coordinator.agent.get('/api/admin/users').query({ locked: 'true' })).body.items).toHaveLength(1);

    expect((await coordinator.agent.post(`/api/admin/users/${buyer.user.id}/unlock`)).body.user.locked).toBe(false);
    expect((await login('4826')).status).toBe(200);
    expect(await AuditLogModel.countDocuments({ action: 'user.unlock' })).toBe(1);
  });

  it('cannot act on coordinator accounts', async () => {
    const app = createMarketTestApp();
    const one = await loginCoordinator(app);
    const two = await loginCoordinator(app);
    for (const action of ['end-sessions', 'unlock']) expect((await one.agent.post(`/api/admin/users/${two.id}/${action}`)).status).toBe(403);
  });

  it('the audit log says who and whom by name', async () => {
    const app = createMarketTestApp();
    const coordinator = await loginCoordinator(app);
    const buyer = await registerAs(app, 'buyer');
    await coordinator.agent.post(`/api/admin/users/${buyer.user.id}/end-sessions`);
    expect((await coordinator.agent.get('/api/admin/audit')).body.items[0]).toMatchObject({ actorName: 'संयोजक', target: { name: 'buyer ji' } });
  });

  it('inviteOnly is only on or off: "pilot" looked switched on but let everyone in', async () => {
    const app = createMarketTestApp();
    const coordinator = await loginCoordinator(app);
    expect((await coordinator.agent.put('/api/admin/flags/inviteOnly').send({ state: 'pilot' })).status).toBe(400);
    await FeatureFlagModel.create({ key: 'inviteOnly', state: 'pilot', updatedBy: coordinator.id });
    const items = (await coordinator.agent.get('/api/admin/flags')).body.items as { key: string; state: string; onOff: boolean }[];
    expect(items.find((flag) => flag.key === 'inviteOnly')).toMatchObject({ state: 'off', onOff: true });
  });
});
