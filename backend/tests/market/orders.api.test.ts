import { describe, expect, it, vi } from 'vitest';
import { UserModel } from '../../src/modules/auth/user.model.js';
import { CommissionEntryModel } from '../../src/modules/commission/commission.model.js';
import { ListingModel } from '../../src/modules/listings/listing.model.js';
import { MarketNotificationModel } from '../../src/modules/notifications/notification.model.js';
import { OrderModel } from '../../src/modules/orders/order.model.js';
import { PushSubscriptionModel } from '../../src/models/PushSubscription.js';
import type { PushSender } from '../../src/services/push/pushSender.js';
import { useTestDatabase } from '../setup/testDatabase.js';
import { createClock, createMarketTestApp, loginCoordinator, readySeller, registerAs } from './marketHelpers.js';

useTestDatabase();

type App = ReturnType<typeof createMarketTestApp>;
type Agent = Awaited<ReturnType<typeof registerAs>>['agent'];

/** A verified seller with 10 quintal bajra at ₹2,500 (optionally bulk: minimum 2), and a buyer. */
async function setup(app: App, listing: Record<string, unknown> = {}) {
  const seller = await readySeller(app);
  const created = await seller.agent.post('/api/market/listings').send({
    category: 'crop',
    product: 'bajra',
    unit: 'quintal',
    quantity: 10,
    pricePerUnitPaise: 2500_00,
    title: { hi: 'साफ़ बाजरा', en: 'Clean Bajra' },
    ...listing,
  });
  const buyer = await registerAs(app, 'buyer');
  return { seller, buyer, listingId: created.body.listing.id as string };
}

function order(buyer: Agent, listingId: string, body: Record<string, unknown> = {}) {
  return buyer.post('/api/market/orders').send({ listingId, quantity: 6, fulfilment: 'pickup', paymentMethod: 'upi', ...body });
}

function move(agent: Agent, orderId: string, to: string, extra: Record<string, unknown> = {}) {
  return agent.post(`/api/market/orders/${orderId}/status`).send({ to, ...extra });
}

const stock = async (listingId: string) => (await ListingModel.findById(listingId).lean())?.quantityAvailable;

describe('placing an order', () => {
  it('creates a request with integer paise totals, no stock taken yet, and tells seller + coordinator', async () => {
    const app = createMarketTestApp();
    await loginCoordinator(app);
    const { seller, buyer, listingId } = await setup(app);

    const res = await order(buyer.agent, listingId, { quantity: 3, fulfilment: 'delivery', deliveryAddress: 'होटल मरुधर, स्टेशन रोड, चूरू' });
    expect(res.status).toBe(201);
    expect(res.body.order).toMatchObject({
      status: 'requested',
      quantity: 3,
      pricePerUnitPaise: 2500_00,
      totalPaise: 7500_00,
      fulfilment: 'delivery',
      viewerRole: 'buyer',
      allowedNext: ['cancelled'],
      canRate: false,
    });
    expect(res.body.order.ref).toMatch(/^AG[2-9A-HJ-NP-Z]{6}$/);
    expect(await stock(listingId)).toBe(10);

    const notified = await MarketNotificationModel.find().lean();
    const coordinators = await UserModel.find({ role: 'coordinator' }).lean();
    expect(coordinators.length).toBeGreaterThan(0);
    expect(notified.map((row) => row.userId.toString()).sort()).toEqual(
      [seller.user.id, ...coordinators.map((user) => user._id.toString())].sort(),
    );
    expect(notified.map((row) => row.userId.toString())).not.toContain(buyer.user.id);
    expect(notified.find((row) => row.userId.toString() === seller.user.id)?.body).toContain('3 क्विंटल बाजरा');
  });

  it('only buyers can order', async () => {
    const app = createMarketTestApp();
    const { seller, listingId } = await setup(app);
    expect((await order(seller.agent, listingId)).status).toBe(403);
  });

  it.each([
    ['more than is available', { quantity: 11 }, 409, 'OUT_OF_STOCK'],
    ['delivery without an address', { fulfilment: 'delivery' }, 400, 'INVALID_INPUT'],
    ['zero quantity', { quantity: 0 }, 400, 'INVALID_INPUT'],
    ['a price request on a normal listing', { offeredPricePerUnitPaise: 2400_00 }, 400, 'INVALID_INPUT'],
  ])('refuses %s', async (_label, body, status, code) => {
    const app = createMarketTestApp();
    const { buyer, listingId } = await setup(app);
    const res = await order(buyer.agent, listingId, body);
    expect(res.status).toBe(status);
    expect(res.body.error.code).toBe(code);
  });

  it('respects the minimum order quantity of bulk listings', async () => {
    const app = createMarketTestApp();
    const { buyer, listingId } = await setup(app, { minOrderQty: 5 });
    expect((await order(buyer.agent, listingId, { quantity: 4 })).body.error.code).toBe('INVALID_INPUT');
    expect((await order(buyer.agent, listingId, { quantity: 5 })).status).toBe(201);
  });

  it('a price request on a bulk listing uses the offered price once the seller accepts', async () => {
    const app = createMarketTestApp();
    const { seller, buyer, listingId } = await setup(app, { minOrderQty: 2 });

    expect((await order(buyer.agent, listingId, { offeredPricePerUnitPaise: 2600_00 })).status).toBe(400); // not below the price
    expect((await order(buyer.agent, listingId, { offeredPricePerUnitPaise: 1000_00 })).status).toBe(400); // under half
    const res = await order(buyer.agent, listingId, { offeredPricePerUnitPaise: 2300_00 });
    expect(res.body.order).toMatchObject({ isPriceRequest: true, pricePerUnitPaise: 2300_00, listedPricePerUnitPaise: 2500_00, totalPaise: 13_800_00 });

    const sellerNote = await MarketNotificationModel.findOne({ userId: seller.user.id }).lean();
    expect(sellerNote?.title).toBe('भाव पूछा गया');
    expect((await move(seller.agent, res.body.order.id, 'accepted')).body.order.totalPaise).toBe(13_800_00);
  });

  it('cannot order from a hidden or paused listing', async () => {
    const app = createMarketTestApp();
    const { seller, buyer, listingId } = await setup(app);
    await seller.agent.patch(`/api/market/listings/${listingId}`).send({ status: 'paused' });
    expect((await order(buyer.agent, listingId)).status).toBe(404);
  });
});

describe('order lifecycle', () => {
  it('delivery: requested → accepted → ready → out for delivery → delivered → paid → completed, then commission and rating', async () => {
    const app = createMarketTestApp({ now: createClock('2026-11-30T19:00:00Z').now });
    const { seller, buyer, listingId } = await setup(app);
    const id = (await order(buyer.agent, listingId, { fulfilment: 'delivery', deliveryAddress: 'वार्ड 5, चूरू' })).body.order.id as string;

    expect((await move(seller.agent, id, 'accepted')).body.order.status).toBe('accepted');
    expect(await stock(listingId)).toBe(4);
    await move(seller.agent, id, 'ready');
    await move(seller.agent, id, 'out_for_delivery');
    await move(buyer.agent, id, 'delivered');
    const paid = await move(seller.agent, id, 'paid', { paidVia: 'cash' });
    expect(paid.body.order).toMatchObject({ status: 'paid', paidVia: 'cash' });
    expect(await CommissionEntryModel.countDocuments()).toBe(0);

    const completed = await move(buyer.agent, id, 'completed');
    expect(completed.body.order).toMatchObject({ status: 'completed', canRate: true });
    expect(completed.body.order).not.toHaveProperty('commissionPaise'); // buyers do not see our commission

    const entry = await CommissionEntryModel.findOne().lean();
    expect(entry).toMatchObject({ orderTotalPaise: 15_000_00, rateBps: 300, amountPaise: 450_00, status: 'due', month: '2026-12' });
    expect((await OrderModel.findById(id).lean())?.commissionPaise).toBe(450_00);
    expect((await seller.agent.get(`/api/market/orders/${id}`)).body.order.commissionPaise).toBe(450_00);
    expect(completed.body.order.history.map((entry: { status: string }) => entry.status)).toEqual([
      'requested',
      'accepted',
      'ready',
      'out_for_delivery',
      'delivered',
      'paid',
      'completed',
    ]);

    const rated = await buyer.agent.post(`/api/market/orders/${id}/rating`).send({ stars: 4, comment: 'अच्छा माल' });
    expect(rated.body.order).toMatchObject({ rating: { stars: 4, comment: 'अच्छा माल' }, canRate: false });
    expect((await buyer.agent.post(`/api/market/orders/${id}/rating`).send({ stars: 5 })).body.error.code).toBe('CONFLICT');
    const listing = (await buyer.agent.get(`/api/market/listings/${listingId}`)).body.listing;
    expect(listing.seller.rating).toEqual({ average: 4, count: 1 });
  });

  it('pickup orders become "ready for pickup", never "out for delivery"', async () => {
    const app = createMarketTestApp();
    const { seller, buyer, listingId } = await setup(app);
    const id = (await order(buyer.agent, listingId)).body.order.id as string;
    await move(seller.agent, id, 'accepted');
    const ready = await move(seller.agent, id, 'ready');
    expect(ready.body.order.allowedNext).toEqual(['ready_for_pickup', 'cancelled']);
    expect((await move(seller.agent, id, 'out_for_delivery')).body.error.code).toBe('INVALID_TRANSITION');
    expect((await move(seller.agent, id, 'ready_for_pickup')).status).toBe(200);
  });

  it('refuses steps that are not allowed for this person or this state', async () => {
    const app = createMarketTestApp();
    const { seller, buyer, listingId } = await setup(app);
    const id = (await order(buyer.agent, listingId)).body.order.id as string;

    expect((await move(buyer.agent, id, 'accepted')).body.error.code).toBe('INVALID_TRANSITION');
    expect((await move(seller.agent, id, 'completed')).body.error.code).toBe('INVALID_TRANSITION');
    expect((await move(seller.agent, id, 'flying')).body.error.code).toBe('INVALID_INPUT');
    expect((await buyer.agent.post(`/api/market/orders/${id}/rating`).send({ stars: 5 })).body.error.code).toBe('CONFLICT');
  });

  it("other people cannot see or change someone else's order; a coordinator can act for the seller", async () => {
    const app = createMarketTestApp();
    const { buyer, listingId } = await setup(app);
    const id = (await order(buyer.agent, listingId)).body.order.id as string;

    const stranger = await registerAs(app, 'buyer');
    expect((await stranger.agent.get(`/api/market/orders/${id}`)).status).toBe(404);
    const otherSeller = await readySeller(app);
    expect((await move(otherSeller.agent, id, 'accepted')).status).toBe(404);

    const coordinator = await loginCoordinator(app);
    const accepted = await move(coordinator.agent, id, 'accepted');
    expect(accepted.body.order).toMatchObject({ status: 'accepted', viewerRole: 'coordinator' });
    expect(accepted.body.order.history[1]).toMatchObject({ status: 'accepted', byRole: 'coordinator' });
  });

  it('lists my orders: buyers see what they placed, sellers what they received', async () => {
    const app = createMarketTestApp();
    const { seller, buyer, listingId } = await setup(app);
    await order(buyer.agent, listingId, { quantity: 1 });
    await order((await registerAs(app, 'buyer')).agent, listingId, { quantity: 2 });

    expect((await buyer.agent.get('/api/market/orders')).body.items).toHaveLength(1);
    expect((await seller.agent.get('/api/market/orders')).body.items).toHaveLength(2);
    expect((await seller.agent.get('/api/market/orders').query({ status: 'accepted' })).body.items).toHaveLength(0);
  });
});

describe('contact and payment details', () => {
  it('phones are shared only after acceptance; the buyer gets the UPI link until the money is confirmed', async () => {
    const app = createMarketTestApp();
    const { seller, buyer, listingId } = await setup(app);
    const placed = await order(buyer.agent, listingId);
    const id = placed.body.order.id as string;
    expect(placed.body.order).not.toHaveProperty('contact');
    expect(placed.body.order).not.toHaveProperty('payment');
    expect(JSON.stringify((await seller.agent.get(`/api/market/orders/${id}`)).body)).not.toContain(buyer.phone);

    await move(seller.agent, id, 'accepted');
    const buyerView = (await buyer.agent.get(`/api/market/orders/${id}`)).body.order;
    expect(buyerView.contact).toMatchObject({ sellerPhone: seller.phone, pickup: { tehsil: 'चूरू' } });
    expect(buyerView.payment).toMatchObject({ upiId: 'sunita@okaxis', amountPaise: 15_000_00 });
    expect(buyerView.payment.upiLink).toContain('upi://pay?pa=sunita%40okaxis');
    expect(buyerView.payment.upiLink).toContain('am=15000.00');

    const sellerView = (await seller.agent.get(`/api/market/orders/${id}`)).body.order;
    expect(sellerView.contact).toEqual({ buyerPhone: buyer.phone, pickup: expect.any(Object) });
    expect(sellerView).not.toHaveProperty('payment');

    await move(seller.agent, id, 'ready');
    await move(seller.agent, id, 'ready_for_pickup');
    await move(buyer.agent, id, 'delivered');
    await move(seller.agent, id, 'paid');
    expect((await buyer.agent.get(`/api/market/orders/${id}`)).body.order).not.toHaveProperty('payment');
  });

  it('rejected orders never share phone numbers', async () => {
    const app = createMarketTestApp();
    const { seller, buyer, listingId } = await setup(app);
    const id = (await order(buyer.agent, listingId)).body.order.id as string;
    await move(seller.agent, id, 'rejected');
    expect((await buyer.agent.get(`/api/market/orders/${id}`)).body.order).not.toHaveProperty('contact');
  });
});

describe('stock reservation', () => {
  it('accepting more than is left fails and changes nothing', async () => {
    const app = createMarketTestApp();
    const { seller, buyer, listingId } = await setup(app);
    const first = (await order(buyer.agent, listingId)).body.order.id as string;
    const second = (await order(buyer.agent, listingId)).body.order.id as string;

    await move(seller.agent, first, 'accepted');
    const refused = await move(seller.agent, second, 'accepted');
    expect(refused.status).toBe(409);
    expect(refused.body.error.code).toBe('OUT_OF_STOCK');

    const unchanged = await OrderModel.findById(second).lean();
    expect(unchanged?.status).toBe('requested');
    expect(unchanged?.history).toHaveLength(1);
    expect(await stock(listingId)).toBe(4);
  });

  it('two accepts at the same moment for the same stock: exactly one wins', async () => {
    const app = createMarketTestApp();
    const { seller, buyer, listingId } = await setup(app);
    const ids = [(await order(buyer.agent, listingId)).body.order.id, (await order(buyer.agent, listingId)).body.order.id] as string[];

    const results = await Promise.all(ids.map((id) => move(seller.agent, id, 'accepted')));
    expect(results.map((res) => res.status).sort()).toEqual([200, 409]);
    expect(await stock(listingId)).toBe(4);
  });

  it('the same order accepted twice at once takes stock only once', async () => {
    const app = createMarketTestApp();
    const { seller, buyer, listingId } = await setup(app);
    const id = (await order(buyer.agent, listingId, { quantity: 2 })).body.order.id as string;
    const coordinator = await loginCoordinator(app);

    const results = await Promise.all([move(seller.agent, id, 'accepted'), move(coordinator.agent, id, 'accepted')]);
    expect(results.map((res) => res.status).sort()).toEqual([200, 409]);
    expect(await stock(listingId)).toBe(8);
  });

  it('the last units mark the listing sold out; cancelling gives them back and reopens it', async () => {
    const app = createMarketTestApp();
    const { seller, buyer, listingId } = await setup(app);
    const id = (await order(buyer.agent, listingId, { quantity: 10 })).body.order.id as string;

    await move(seller.agent, id, 'accepted');
    expect(await ListingModel.findById(listingId).lean()).toMatchObject({ quantityAvailable: 0, status: 'sold_out' });

    await move(buyer.agent, id, 'cancelled');
    expect(await ListingModel.findById(listingId).lean()).toMatchObject({ quantityAvailable: 10, status: 'active' });
  });

  it('cancelling a request that was never accepted does not add stock', async () => {
    const app = createMarketTestApp();
    const { buyer, listingId } = await setup(app);
    const id = (await order(buyer.agent, listingId)).body.order.id as string;
    await move(buyer.agent, id, 'cancelled');
    expect(await stock(listingId)).toBe(10);
  });
});

describe('commission', () => {
  it('uses the configured rate and is booked only once per order', async () => {
    const app = createMarketTestApp({ config: { jwtSecret: 'x'.repeat(32), cookieSecure: false, commissionBps: 250 } });
    const { seller, buyer, listingId } = await setup(app, { pricePerUnitPaise: 1234_57 });
    const id = (await order(buyer.agent, listingId, { quantity: 3 })).body.order.id as string;
    for (const [agent, to] of [
      [seller.agent, 'accepted'],
      [seller.agent, 'ready'],
      [seller.agent, 'ready_for_pickup'],
      [buyer.agent, 'delivered'],
      [seller.agent, 'paid'],
      [buyer.agent, 'completed'],
    ] as const) {
      expect((await move(agent, id, to)).status).toBe(200);
    }
    expect((await move(buyer.agent, id, 'completed')).body.error.code).toBe('INVALID_TRANSITION');

    const entries = await CommissionEntryModel.find().lean();
    expect(entries).toHaveLength(1);
    // 3 × ₹1,234.57 = ₹3,703.71; 2.5% = 9259.275 paise → 9259
    expect(entries[0]).toMatchObject({ orderTotalPaise: 3703_71, rateBps: 250, amountPaise: 92_59 });
  });
});

describe('notifications and reports', () => {
  it('every step notifies the others (not the person who did it); marking read works per user', async () => {
    const app = createMarketTestApp();
    const { seller, buyer, listingId } = await setup(app);
    const id = (await order(buyer.agent, listingId)).body.order.id as string;
    await move(seller.agent, id, 'accepted');

    const buyerList = (await buyer.agent.get('/api/market/notifications')).body;
    expect(buyerList.unreadCount).toBe(1);
    expect(buyerList.items[0]).toMatchObject({ kind: 'accepted', title: 'ऑर्डर मंज़ूर हुआ', href: `#/orders/${id}`, read: false });

    await buyer.agent.post('/api/market/notifications/read').send({});
    expect((await buyer.agent.get('/api/market/notifications')).body.unreadCount).toBe(0);
    expect((await seller.agent.get('/api/market/notifications')).body.unreadCount).toBe(1);
  });

  it('sends a web push to the phones linked to the account, and logout unlinks the phone', async () => {
    const send = vi.fn<PushSender['send']>(async () => 'sent');
    const app = createMarketTestApp({ pushSender: { send } });
    const { seller, buyer, listingId } = await setup(app);
    const subscription = { endpoint: 'https://push.example/seller-phone', keys: { p256dh: 'p', auth: 'a' } };
    await seller.agent.post('/api/market/push/subscribe').send({ deviceId: crypto.randomUUID(), subscription });

    await order(buyer.agent, listingId);
    expect(send).toHaveBeenCalledWith(subscription, expect.objectContaining({ title: 'नया ऑर्डर आया', url: expect.stringMatching(/^#\/orders\//) }));

    await seller.agent.post('/api/auth/logout').send({ pushEndpoint: subscription.endpoint });
    expect((await PushSubscriptionModel.findOne({ endpoint: subscription.endpoint }).lean())?.userId).toBeUndefined();
  });

  it('a buyer can report a problem with an order; coordinators are told; strangers cannot report it', async () => {
    const app = createMarketTestApp();
    const coordinator = await loginCoordinator(app);
    const { buyer, listingId } = await setup(app);
    const id = (await order(buyer.agent, listingId)).body.order.id as string;

    const res = await buyer.agent.post('/api/market/reports').send({ orderId: id, reason: 'quality', text: 'माल गीला है' });
    expect(res.status).toBe(201);
    const note = await MarketNotificationModel.findOne({ userId: coordinator.id, kind: 'report' }).lean();
    expect(note?.body).toContain('माल गीला है');

    const stranger = await registerAs(app, 'buyer');
    expect((await stranger.agent.post('/api/market/reports').send({ orderId: id, reason: 'quality' })).status).toBe(404);
    expect((await stranger.agent.post('/api/market/reports').send({ listingId, reason: 'fake_listing' })).status).toBe(201);
    expect((await stranger.agent.post('/api/market/reports').send({ reason: 'other' })).status).toBe(400);
  });

  it('a seller whose account was deleted still leaves orders readable for the buyer', async () => {
    const app = createMarketTestApp();
    const { seller, buyer, listingId } = await setup(app);
    const id = (await order(buyer.agent, listingId)).body.order.id as string;
    await UserModel.deleteOne({ _id: seller.user.id });
    expect((await buyer.agent.get(`/api/market/orders/${id}`)).body.order.seller.name).toBe('सुनीता देवी');
  });
});
