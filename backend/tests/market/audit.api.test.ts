import { describe, expect, it } from 'vitest';
import { AuditLogModel } from '../../src/modules/audit/audit.model.js';
import { useTestDatabase } from '../setup/testDatabase.js';
import { createMarketTestApp, loginCoordinator, readySeller, registerAs } from './marketHelpers.js';

useTestDatabase();

const listingBody = { category: 'crop', product: 'bajra', unit: 'quintal', quantity: 20, pricePerUnitPaise: 2500_00, title: { hi: 'बाजरा' } };

describe('audit log of coordinator actions', () => {
  it('records who did what to which record, newest first, without phone numbers or PINs', async () => {
    const app = createMarketTestApp();
    const coordinator = await loginCoordinator(app);
    const seller = await readySeller(app, { verified: false });
    const listingId = (await seller.agent.post('/api/market/listings').send(listingBody)).body.listing.id as string;

    await coordinator.agent.post(`/api/admin/sellers/${seller.user.id}/reject`).send({ reason: 'UPI ID गलत है' });
    await coordinator.agent.post(`/api/admin/sellers/${seller.user.id}/verify`).send({});
    await coordinator.agent.post(`/api/admin/listings/${listingId}/hide`).send({ reason: 'गलत फोटो' });
    await coordinator.agent.patch(`/api/market/listings/${listingId}`).send({ pricePerUnitPaise: 2400_00 });
    await coordinator.agent.post('/api/admin/sellers').send({
      name: 'कमला देवी',
      phone: '9822222222',
      pin: '5937',
      village: 'घांघू',
      upiId: 'kamla@okaxis',
      pickup: { lat: 28.3, lon: 74.95 },
    });

    const res = await coordinator.agent.get('/api/admin/audit');
    expect(res.status).toBe(200);
    expect(res.body.items.map((entry: { action: string }) => entry.action)).toEqual([
      'seller.create',
      'listing.update',
      'listing.hide',
      'seller.verify',
      'seller.reject',
    ]);
    expect(res.body.items[4]).toMatchObject({
      actorId: coordinator.id,
      actorRole: 'coordinator',
      target: { type: 'user', id: seller.user.id },
      details: { reason: 'UPI ID गलत है' },
    });
    const raw = JSON.stringify(res.body);
    expect(raw).not.toContain('9822222222');
    expect(raw).not.toContain('5937');

    const forListing = await coordinator.agent.get('/api/admin/audit').query({ targetId: listingId });
    expect(forListing.body.items).toHaveLength(2);
  });

  it("a seller's own edits and a buyer's orders are not coordinator actions and are not logged", async () => {
    const app = createMarketTestApp();
    const seller = await readySeller(app);
    const listingId = (await seller.agent.post('/api/market/listings').send(listingBody)).body.listing.id as string;
    await seller.agent.patch(`/api/market/listings/${listingId}`).send({ status: 'paused' });
    const buyer = await registerAs(app, 'buyer');
    await buyer.agent.post('/api/market/reports').send({ listingId, reason: 'quality' });
    expect(await AuditLogModel.countDocuments()).toBe(0);
  });

  it('is append-only: the model refuses updates and deletes', async () => {
    const app = createMarketTestApp();
    const coordinator = await loginCoordinator(app);
    const seller = await readySeller(app, { verified: false });
    await coordinator.agent.post(`/api/admin/sellers/${seller.user.id}/verify`).send({});

    await expect(AuditLogModel.updateMany({}, { $set: { action: 'seller.reject' } }).exec()).rejects.toThrow(/append-only/);
    await expect(AuditLogModel.deleteMany({}).exec()).rejects.toThrow(/append-only/);
    await expect(AuditLogModel.findOneAndDelete({}).exec()).rejects.toThrow(/append-only/);
    expect(await AuditLogModel.countDocuments()).toBe(1);
  });
});
