import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { flagDefaults } from '../../src/config/featureFlags.js';
import { COMPLAINT_RULES, COMPLAINT_TRANSITIONS } from '../../src/config/complaintRules.js';
import { UserModel } from '../../src/modules/auth/user.model.js';
import { AuditLogModel } from '../../src/modules/audit/audit.model.js';
import { FeatureFlags } from '../../src/modules/flags/flag.service.js';
import { JPEG_BYTES } from '../helpers.js';
import { useTestDatabase } from '../setup/testDatabase.js';
import { createClock, createMarketTestApp, loginCoordinator, readySeller, registerAs } from './marketHelpers.js';

useTestDatabase();

const listingBody = { category: 'crop', product: 'bajra', unit: 'quintal', quantity: 50, pricePerUnitPaise: 2500_00, title: { hi: 'बाजरा' } };

async function setup() {
  const clock = createClock();
  const app = createMarketTestApp({ now: clock.now }, { flags: new FeatureFlags({ ...flagDefaults(undefined), complaints: 'all' }) });
  const seller = await readySeller(app);
  const listingId = (await seller.agent.post('/api/market/listings').send(listingBody)).body.listing.id as string;
  const buyer = await registerAs(app, 'buyer');
  const order = async (agent = buyer.agent) =>
    (await agent.post('/api/market/orders').send({ listingId, quantity: 1, fulfilment: 'pickup', paymentMethod: 'cash' })).body.order.id as string;
  const coordinator = await loginCoordinator(app);
  return { app, clock, seller, buyer, listingId, order, coordinator };
}

describe('complaint status flow', () => {
  it('open → in progress → resolved/rejected; closed ones never reopen', () => {
    expect(COMPLAINT_TRANSITIONS.open).toContain('in_progress');
    expect(COMPLAINT_TRANSITIONS.resolved).toEqual([]);
    expect(COMPLAINT_TRANSITIONS.rejected).toEqual([]);
  });
});

describe('raising a complaint', () => {
  it('the buyer complains about an order, with a private photo; it is against the seller with an SLA time', async () => {
    const { app, buyer, seller, order } = await setup();
    const orderId = await order();
    const photoId = (await buyer.agent.post('/api/complaints/photos').attach('image', JPEG_BYTES, { filename: 'x.jpg', contentType: 'image/jpeg' })).body.photoId as string;
    const res = await buyer.agent.post('/api/complaints').send({ target: { kind: 'order', id: orderId }, category: 'quality', text: 'बाजरे में मिट्टी मिली है', photoId });
    expect(res.status).toBe(201);
    expect(res.body.complaint).toMatchObject({ status: 'open', viewerRole: 'reporter', against: { name: expect.any(String) }, overdue: false, allowedNext: [] });
    expect(new Date(res.body.complaint.slaDueAt).getTime() - Date.parse('2026-11-10T06:30:00Z')).toBe(COMPLAINT_RULES.slaHours * 3_600_000);

    const photoUrl = res.body.complaint.photoUrl as string;
    expect((await seller.agent.get(photoUrl)).status).toBe(200);
    expect((await request(app).get(photoUrl)).status).toBe(404);
    // The seller sees the complaint about them and can answer.
    const mine = await seller.agent.get('/api/complaints');
    expect(mine.body.items[0].viewerRole).toBe('against');
  });

  it("nobody complains about someone else's order or their own listing; a guest cannot complain", async () => {
    const { app, seller, listingId, order } = await setup();
    const orderId = await order();
    const stranger = await registerAs(app, 'buyer');
    expect((await stranger.agent.post('/api/complaints').send({ target: { kind: 'order', id: orderId }, category: 'quality', text: 'कुछ भी' })).status).toBe(404);
    expect((await seller.agent.post('/api/complaints').send({ target: { kind: 'listing', id: listingId }, category: 'fake_listing', text: 'अपनी ही' })).status).toBe(404);
    expect((await request(app).post('/api/complaints').set('X-Requested-With', 'agriai').send({})).status).toBe(401);
    expect((await stranger.agent.post('/api/complaints').send({ target: { kind: 'listing', id: listingId }, category: 'fake_listing', text: 'नकली लगता है' })).status).toBe(201);
  });

  it('is off without the complaints flag', async () => {
    const app = createMarketTestApp();
    const buyer = await registerAs(app, 'buyer');
    expect((await buyer.agent.get('/api/complaints')).status).toBe(403);
  });
});

describe('coordinator queue', () => {
  it('messages reach both sides; strangers see nothing; SLA shows overdue', async () => {
    const { app, clock, buyer, seller, order, coordinator } = await setup();
    const orderId = await order();
    const id = (await buyer.agent.post('/api/complaints').send({ target: { kind: 'order', id: orderId }, category: 'not_delivered', text: 'माल नहीं आया' })).body.complaint.id as string;
    await coordinator.agent.post(`/api/complaints/${id}/messages`).send({ text: 'दोनों से बात कर रहे हैं' });
    await seller.agent.post(`/api/complaints/${id}/messages`).send({ text: 'कल भेज दूँगा' });
    const seen = await buyer.agent.get(`/api/complaints/${id}`);
    expect(seen.body.complaint.messages.map((message: { fromRole: string }) => message.fromRole)).toEqual(['coordinator', 'seller']);
    const stranger = await registerAs(app, 'buyer');
    expect((await stranger.agent.get(`/api/complaints/${id}`)).status).toBe(404);
    expect((await stranger.agent.post(`/api/complaints/${id}/messages`).send({ text: 'हाय' })).status).toBe(404);
    expect((await buyer.agent.get('/api/admin/complaints')).status).toBe(403);

    clock.advanceMinutes(49 * 60);
    const queue = await coordinator.agent.get('/api/admin/complaints');
    expect(queue.body.items[0]).toMatchObject({ id, overdue: true, allowedNext: ['in_progress', 'resolved', 'rejected'] });
  });

  it('closing needs a note, is audited, tells both sides and ends the conversation', async () => {
    const { buyer, seller, order, coordinator } = await setup();
    const orderId = await order();
    const id = (await buyer.agent.post('/api/complaints').send({ target: { kind: 'order', id: orderId }, category: 'payment', text: 'पैसे का झगड़ा' })).body.complaint.id as string;
    expect((await coordinator.agent.post(`/api/admin/complaints/${id}/status`).send({ to: 'resolved' })).status).toBe(400);
    expect((await coordinator.agent.post(`/api/admin/complaints/${id}/status`).send({ to: 'in_progress' })).body.complaint.status).toBe('in_progress');
    const done = await coordinator.agent.post(`/api/admin/complaints/${id}/status`).send({ to: 'rejected', resolution: 'दोनों ने मान लिया, गलतफ़हमी थी' });
    expect(done.body.complaint).toMatchObject({ status: 'rejected', resolution: 'दोनों ने मान लिया, गलतफ़हमी थी' });
    expect((await coordinator.agent.post(`/api/admin/complaints/${id}/status`).send({ to: 'in_progress' })).status).toBe(409);
    expect((await buyer.agent.post(`/api/complaints/${id}/messages`).send({ text: 'फिर से' })).status).toBe(409);
    expect(await AuditLogModel.countDocuments({ action: 'complaint.status' })).toBe(2);
    for (const person of [buyer, seller]) {
      const notes = await person.agent.get('/api/market/notifications');
      expect(notes.body.items.some((item: { kind: string; title: string }) => item.kind === 'complaint' && item.title.includes('बंद'))).toBe(true);
    }
  });

  it('a seller with repeated valid complaints is flagged once; a coordinator clears it', async () => {
    const { seller, buyer, order, coordinator } = await setup();
    const resolveOne = async () => {
      const orderId = await order();
      const id = (await buyer.agent.post('/api/complaints').send({ target: { kind: 'order', id: orderId }, category: 'quality', text: 'खराब माल' })).body.complaint.id as string;
      return (await coordinator.agent.post(`/api/admin/complaints/${id}/status`).send({ to: 'resolved', resolution: 'शिकायत सही थी' })).body.flagged as boolean;
    };
    // A rejected complaint does not count.
    const firstOrder = await order();
    const rejected = (await buyer.agent.post('/api/complaints').send({ target: { kind: 'order', id: firstOrder }, category: 'quality', text: 'गलत शिकायत' })).body.complaint.id as string;
    await coordinator.agent.post(`/api/admin/complaints/${rejected}/status`).send({ to: 'rejected', resolution: 'सही नहीं' });
    const flags = [];
    for (let i = 0; i < COMPLAINT_RULES.flagThreshold + 1; i++) flags.push(await resolveOne());
    expect(flags).toEqual([false, false, true, false]);
    expect((await UserModel.findById(seller.user.id).lean().exec())?.flaggedForReview?.complaints).toBe(3);
    const sellers = await coordinator.agent.get('/api/admin/sellers');
    expect(sellers.body.items.find((item: { id: string }) => item.id === seller.user.id).flaggedForReview).toBeDefined();
    expect((await coordinator.agent.post(`/api/admin/users/${seller.user.id}/clear-flag`)).status).toBe(200);
    expect((await UserModel.findById(seller.user.id).lean().exec())?.flaggedForReview).toBeUndefined();
  });

  it('the old "समस्या बताएँ" report lands in the same queue, against the seller', async () => {
    const { buyer, order, coordinator } = await setup();
    const orderId = await order();
    await buyer.agent.post('/api/market/reports').send({ orderId, reason: 'quality', text: 'पुराना तरीका' });
    const queue = await coordinator.agent.get('/api/admin/complaints');
    expect(queue.body.items[0]).toMatchObject({ status: 'open', against: { name: expect.any(String) } });
  });
});
