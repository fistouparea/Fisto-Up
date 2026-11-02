import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { flagDefaults } from '../../src/config/featureFlags.js';
import { OrderModel } from '../../src/modules/orders/order.model.js';
import { FeatureFlags } from '../../src/modules/flags/flag.service.js';
import { AuditLogModel } from '../../src/modules/audit/audit.model.js';
import { JPEG_BYTES } from '../helpers.js';
import { useTestDatabase } from '../setup/testDatabase.js';
import { createClock, createMarketTestApp, loginCoordinator, readySeller, registerAs } from './marketHelpers.js';

useTestDatabase();

const listingBody = { category: 'crop', product: 'bajra', unit: 'quintal', quantity: 20, pricePerUnitPaise: 2500_00, title: { hi: 'बाजरा' } };

async function setup() {
  const clock = createClock();
  const app = createMarketTestApp({ now: clock.now }, { flags: new FeatureFlags({ ...flagDefaults(undefined), deliveryTracking: 'all' }) });
  const seller = await readySeller(app);
  const listingId = (await seller.agent.post('/api/market/listings').send(listingBody)).body.listing.id as string;
  const buyer = await registerAs(app, 'buyer');
  const place = async () => {
    const orderId = (
      await buyer.agent.post('/api/market/orders').send({ listingId, quantity: 2, fulfilment: 'delivery', deliveryAddress: 'वार्ड 7, रतनगढ़', paymentMethod: 'cash' })
    ).body.order.id as string;
    await seller.agent.post(`/api/market/orders/${orderId}/status`).send({ to: 'accepted' });
    return orderId;
  };
  const coordinator = await loginCoordinator(app);
  const linkFor = async (orderId: string) => {
    await coordinator.agent.put(`/api/admin/orders/${orderId}/delivery`).send({ name: 'सुरेश', phone: '9876500011' });
    return coordinator.agent.post(`/api/admin/orders/${orderId}/delivery-link`).send({});
  };
  return { app, clock, seller, buyer, coordinator, place, linkFor };
}

describe('delivery link', () => {
  it('only coordinators create it, only with a delivery person, and the token is never stored or logged', async () => {
    const { buyer, coordinator, place, linkFor } = await setup();
    const orderId = await place();
    expect((await buyer.agent.post(`/api/admin/orders/${orderId}/delivery-link`).send({})).status).toBe(403);
    expect((await coordinator.agent.post(`/api/admin/orders/${orderId}/delivery-link`).send({})).status).toBe(400);
    const res = await linkFor(orderId);
    expect(res.status).toBe(201);
    expect(res.body.token).toMatch(/^[A-Za-z0-9_-]{32}$/);
    const stored = JSON.stringify(await OrderModel.findById(orderId).lean().exec());
    expect(stored).not.toContain(res.body.token);
    expect(JSON.stringify(await AuditLogModel.find().lean().exec())).not.toContain(res.body.token);
  });

  it('shows only what is needed to deliver: no phone numbers or prices', async () => {
    const { app, buyer, place, linkFor } = await setup();
    const orderId = await place();
    const { token } = (await linkFor(orderId)).body as { token: string };
    const page = await request(app).get(`/api/delivery/${token}`);
    expect(page.status).toBe(200);
    expect(page.body.delivery).toMatchObject({ address: 'वार्ड 7, रतनगढ़', done: [], next: 'picked' });
    expect(JSON.stringify(page.body)).not.toContain(buyer.phone);
    expect(JSON.stringify(page.body)).not.toMatch(/Paise|upi/i);
  });

  it('wrong, malformed, replaced and expired tokens all answer 404', async () => {
    const { app, clock, place, linkFor } = await setup();
    const orderId = await place();
    const first = (await linkFor(orderId)).body.token as string;
    expect((await request(app).get(`/api/delivery/${'A'.repeat(32)}`)).status).toBe(404);
    expect((await request(app).get('/api/delivery/short')).status).toBe(404);
    const second = (await linkFor(orderId)).body.token as string;
    expect((await request(app).get(`/api/delivery/${first}`)).status).toBe(404);
    expect((await request(app).get(`/api/delivery/${second}`)).status).toBe(200);
    clock.advanceMinutes(15 * 24 * 60);
    expect((await request(app).get(`/api/delivery/${second}`)).status).toBe(404);
  });

  it("one order's link never touches another order", async () => {
    const { app, place, linkFor } = await setup();
    const a = await place();
    const b = await place();
    const tokenA = (await linkFor(a)).body.token as string;
    await linkFor(b);
    await request(app).post(`/api/delivery/${tokenA}/step`).set('X-Requested-With', 'agriai').field('step', 'picked');
    expect((await OrderModel.findById(a).lean().exec())?.deliveryEvents).toHaveLength(1);
    expect((await OrderModel.findById(b).lean().exec())?.deliveryEvents).toHaveLength(0);
  });
});

describe('delivery steps', () => {
  it('only in order; photo proof is private; buyer and seller are told; the link dies after delivery', async () => {
    const { app, buyer, seller, place, linkFor } = await setup();
    const orderId = await place();
    const token = (await linkFor(orderId)).body.token as string;
    const step = (name: string) => request(app).post(`/api/delivery/${token}/step`).set('X-Requested-With', 'agriai').field('step', name);

    expect((await step('delivered')).status).toBe(409);
    expect((await step('picked')).body.delivery.next).toBe('on_the_way');
    expect((await step('picked')).status).toBe(409);
    expect((await step('on_the_way')).status).toBe(200);
    const done = await request(app)
      .post(`/api/delivery/${token}/step`)
      .set('X-Requested-With', 'agriai')
      .field('step', 'delivered')
      .attach('photo', JPEG_BYTES, { filename: 'proof.jpg', contentType: 'image/jpeg' });
    expect(done.status).toBe(200);
    expect(done.body.delivery.next).toBeNull();
    expect((await request(app).get(`/api/delivery/${token}`)).status).toBe(404);

    const order = (await buyer.agent.get(`/api/market/orders/${orderId}`)).body.order;
    expect(order.deliveryEvents.map((event: { step: string }) => event.step)).toEqual(['picked', 'on_the_way', 'delivered']);
    // The order status is still confirmed by the buyer/seller themselves.
    expect(order.status).toBe('accepted');
    const photoUrl = order.deliveryEvents[2].photoUrl as string;
    expect((await buyer.agent.get(photoUrl)).status).toBe(200);
    expect((await request(app).get(photoUrl)).status).toBe(404);
    const stranger = await registerAs(app, 'buyer');
    expect((await stranger.agent.get(photoUrl)).status).toBe(404);

    for (const person of [buyer, seller]) {
      const notes = await person.agent.get('/api/market/notifications');
      expect(notes.body.items.filter((item: { kind: string }) => item.kind === 'delivery')).toHaveLength(3);
    }
  });

  it('refuses unknown steps and non-image files', async () => {
    const { app, place, linkFor } = await setup();
    const token = (await linkFor(await place())).body.token as string;
    expect((await request(app).post(`/api/delivery/${token}/step`).set('X-Requested-With', 'agriai').field('step', 'flying')).status).toBe(400);
    const bad = await request(app)
      .post(`/api/delivery/${token}/step`)
      .set('X-Requested-With', 'agriai')
      .field('step', 'picked')
      .attach('photo', Buffer.from('not an image'), { filename: 'x.jpg', contentType: 'image/jpeg' });
    expect(bad.status).toBe(400);
  });
});
