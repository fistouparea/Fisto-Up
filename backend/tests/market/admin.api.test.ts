import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { csvCell } from '../../src/utils/csv.js';
import { CommissionEntryModel } from '../../src/modules/commission/commission.model.js';
import { ListingModel, ListingPhotoModel } from '../../src/modules/listings/listing.model.js';
import { JPEG_BYTES } from '../helpers.js';
import { useTestDatabase } from '../setup/testDatabase.js';
import { createClock, createMarketTestApp, loginCoordinator, nextPhone, readySeller, registerAs, sellerProfile } from './marketHelpers.js';

useTestDatabase();

type App = ReturnType<typeof createMarketTestApp>;
type Agent = Awaited<ReturnType<typeof registerAs>>['agent'];

const listingBody = { category: 'crop', product: 'bajra', unit: 'quintal', quantity: 20, pricePerUnitPaise: 2500_00, title: { hi: 'बाजरा' } };

async function listingOf(seller: { agent: Agent }, body: Record<string, unknown> = {}) {
  return (await seller.agent.post('/api/market/listings').send({ ...listingBody, ...body })).body.listing.id as string;
}

/** Runs an order all the way to completed through the API. */
async function completedOrder(seller: { agent: Agent }, buyer: Agent, listingId: string, quantity: number) {
  const id = (await buyer.post('/api/market/orders').send({ listingId, quantity, fulfilment: 'pickup', paymentMethod: 'upi' })).body.order.id as string;
  for (const [agent, to] of [
    [seller.agent, 'accepted'],
    [seller.agent, 'ready'],
    [seller.agent, 'ready_for_pickup'],
    [buyer, 'delivered'],
    [seller.agent, 'paid'],
    [buyer, 'completed'],
  ] as const) {
    const res = await agent.post(`/api/market/orders/${id}/status`).send({ to });
    if (res.status !== 200) throw new Error(`${to} failed: ${JSON.stringify(res.body)}`);
  }
  return id;
}

describe('coordinator-only access', () => {
  const ADMIN_GETS = ['/api/admin/stats', '/api/admin/sellers', '/api/admin/reports', '/api/admin/orders', '/api/admin/commission', '/api/admin/commission/months', '/api/admin/commission/export.csv', '/api/admin/listings/hidden'];

  it.each(ADMIN_GETS)('%s: 401 for guests, 403 for sellers and buyers, 200 for coordinators', async (path) => {
    const app = createMarketTestApp();
    expect((await request(app).get(path)).status).toBe(401);
    expect((await (await registerAs(app, 'seller')).agent.get(path)).status).toBe(403);
    expect((await (await registerAs(app, 'buyer')).agent.get(path)).status).toBe(403);
    expect((await (await loginCoordinator(app)).agent.get(path)).status).toBe(200);
  });

  it('sellers cannot verify themselves or mark commission collected', async () => {
    const app = createMarketTestApp();
    const seller = await readySeller(app, { verified: false });
    expect((await seller.agent.post(`/api/admin/sellers/${seller.user.id}/verify`).send({})).status).toBe(403);
    expect((await seller.agent.post('/api/admin/commission/collect').send({ sellerId: seller.user.id })).status).toBe(403);
  });
});

describe('verifying sellers', () => {
  it('lists pending sellers with their phone and UPI, verifies one and their listings go live', async () => {
    const app = createMarketTestApp();
    const coordinator = await loginCoordinator(app);
    const seller = await readySeller(app, { verified: false });
    const listingId = await listingOf(seller);
    expect((await request(app).get(`/api/market/listings/${listingId}`)).status).toBe(404);

    const pending = await coordinator.agent.get('/api/admin/sellers').query({ status: 'pending' });
    expect(pending.body.items).toHaveLength(1);
    expect(pending.body.items[0]).toMatchObject({ id: seller.user.id, phone: seller.phone, upiId: 'sunita@okaxis', profileComplete: true, listings: 1 });

    const verified = await coordinator.agent.post(`/api/admin/sellers/${seller.user.id}/verify`).send({});
    expect(verified.body.seller.status).toBe('verified');
    expect((await request(app).get(`/api/market/listings/${listingId}`)).status).toBe(200);
  });

  it('rejects with a reason the seller sees; fixing the profile sends it back to pending', async () => {
    const app = createMarketTestApp();
    const coordinator = await loginCoordinator(app);
    const seller = await readySeller(app, { verified: false });

    expect((await coordinator.agent.post(`/api/admin/sellers/${seller.user.id}/reject`).send({})).status).toBe(400);
    await coordinator.agent.post(`/api/admin/sellers/${seller.user.id}/reject`).send({ reason: 'UPI ID गलत है' });
    expect((await seller.agent.get('/api/auth/me')).body.user.seller).toMatchObject({ status: 'rejected', rejectReason: 'UPI ID गलत है' });

    const fixed = await seller.agent.put('/api/account/seller-profile').send({ ...sellerProfile, upiId: 'sunita@ybl' });
    expect(fixed.body.user.seller.status).toBe('pending');
  });

  it('can sign up a verified seller for someone who cannot use the app', async () => {
    const app = createMarketTestApp();
    const coordinator = await loginCoordinator(app);
    const phone = nextPhone();
    const res = await coordinator.agent.post('/api/admin/sellers').send({ ...sellerProfile, name: 'कमला देवी', phone, pin: '8264' });
    expect(res.status).toBe(201);
    expect(res.body.seller).toMatchObject({ name: 'कमला देवी', status: 'verified', assisted: true, profileComplete: true });

    const login = await request(app).post('/api/auth/login').set('X-Requested-With', 'agriai').send({ phone, pin: '8264' });
    expect(login.body.user).toMatchObject({ role: 'seller', seller: { status: 'verified' } });
  });

  it('searches sellers by name, phone or village', async () => {
    const app = createMarketTestApp();
    const coordinator = await loginCoordinator(app);
    const seller = await readySeller(app);
    expect((await coordinator.agent.get('/api/admin/sellers').query({ q: seller.phone.slice(-4) })).body.items).toHaveLength(1);
    expect((await coordinator.agent.get('/api/admin/sellers').query({ q: 'घांघू' })).body.items).toHaveLength(1);
    expect((await coordinator.agent.get('/api/admin/sellers').query({ q: '(.*' })).body.items).toHaveLength(0);
  });
});

describe('reports and hiding listings', () => {
  it('shows flagged listings, hides one from the marketplace, shows it again and resolves the report', async () => {
    const app = createMarketTestApp();
    const coordinator = await loginCoordinator(app);
    const listingId = await listingOf(await readySeller(app));
    const buyer = await registerAs(app, 'buyer');
    await buyer.agent.post('/api/market/reports').send({ listingId, reason: 'fake_listing', text: 'फोटो किसी और का' });

    const reports = (await coordinator.agent.get('/api/admin/reports')).body.items;
    expect(reports[0]).toMatchObject({ reason: 'fake_listing', text: 'फोटो किसी और का', reporter: { role: 'buyer' }, listing: { id: listingId, hidden: false } });

    await coordinator.agent.post(`/api/admin/listings/${listingId}/hide`).send({ reason: 'जाँच चल रही है' });
    expect((await request(app).get('/api/market/listings')).body.items).toHaveLength(0);
    expect((await coordinator.agent.get('/api/admin/listings/hidden')).body.items[0]).toMatchObject({ id: listingId, hidden: true });

    await coordinator.agent.post(`/api/admin/listings/${listingId}/unhide`);
    expect((await request(app).get('/api/market/listings')).body.items).toHaveLength(1);

    await coordinator.agent.post(`/api/admin/reports/${reports[0].id}/resolve`).send({ resolution: 'ठीक है' });
    expect((await coordinator.agent.get('/api/admin/reports')).body.items).toHaveLength(0);
    expect((await coordinator.agent.get('/api/admin/reports').query({ status: 'resolved' })).body.items[0].resolution).toBe('ठीक है');
    expect((await coordinator.agent.post(`/api/admin/reports/${reports[0].id}/resolve`).send({})).status).toBe(404);
  });
});

describe('assisted listing', () => {
  it("creates a listing for a seller with the coordinator's photo and records the seller's consent", async () => {
    const app = createMarketTestApp();
    const coordinator = await loginCoordinator(app);
    const seller = await readySeller(app);
    const photoId = (await coordinator.agent.post('/api/market/photos').attach('image', JPEG_BYTES, { filename: 'p.jpg', contentType: 'image/jpeg' })).body.photoId;

    const res = await coordinator.agent.post('/api/admin/listings').send({
      ...listingBody,
      sellerId: seller.user.id,
      photoIds: [photoId],
      consent: { method: 'thumbprint', note: 'ग्राम सभा में अंगूठा लगाया' },
    });
    expect(res.status).toBe(201);
    const saved = await ListingModel.findById(res.body.listing.id).lean();
    expect(saved?.sellerId.toString()).toBe(seller.user.id);
    expect(saved?.assisted).toMatchObject({ coordinatorId: expect.anything(), consentMethod: 'thumbprint', consentNote: 'ग्राम सभा में अंगूठा लगाया' });
    expect(await ListingPhotoModel.findById(photoId).lean()).toMatchObject({ attached: true });

    expect((await seller.agent.get('/api/market/my/listings')).body.items).toHaveLength(1);
  });

  it('needs the consent and an existing seller', async () => {
    const app = createMarketTestApp();
    const coordinator = await loginCoordinator(app);
    const seller = await readySeller(app);
    expect((await coordinator.agent.post('/api/admin/listings').send({ ...listingBody, sellerId: seller.user.id })).status).toBe(400);
    const buyer = await registerAs(app, 'buyer');
    const forBuyer = await coordinator.agent.post('/api/admin/listings').send({ ...listingBody, sellerId: buyer.user.id, consent: { method: 'verbal' } });
    expect(forBuyer.status).toBe(404);
  });
});

describe('orders board', () => {
  it('filters by status and assigns a delivery person both sides can see', async () => {
    const app = createMarketTestApp();
    const coordinator = await loginCoordinator(app);
    const seller = await readySeller(app);
    const listingId = await listingOf(seller);
    const buyer = await registerAs(app, 'buyer');
    const orderId = (await buyer.agent.post('/api/market/orders').send({ listingId, quantity: 2, fulfilment: 'delivery', deliveryAddress: 'स्टेशन रोड, चूरू', paymentMethod: 'cash' })).body.order.id;

    expect((await coordinator.agent.get('/api/admin/orders').query({ status: 'requested' })).body.items).toHaveLength(1);
    expect((await coordinator.agent.get('/api/admin/orders').query({ status: 'accepted' })).body.items).toHaveLength(0);
    const board = (await coordinator.agent.get('/api/admin/orders')).body.items[0];
    expect(board).toMatchObject({ viewerRole: 'coordinator', allowedNext: ['accepted', 'rejected', 'cancelled'], contact: { sellerPhone: seller.phone, buyerPhone: buyer.phone } });

    expect((await coordinator.agent.put(`/api/admin/orders/${orderId}/delivery`).send({ name: 'रमेश', phone: '12345' })).status).toBe(400);
    await coordinator.agent.put(`/api/admin/orders/${orderId}/delivery`).send({ name: 'रमेश कुमार', phone: '9414000001' });
    expect((await buyer.agent.get(`/api/market/orders/${orderId}`)).body.order.deliveryPerson).toEqual({ name: 'रमेश कुमार', phone: '9414000001' });
  });
});

describe('commission ledger', () => {
  async function ledgerSetup(app: App) {
    const coordinator = await loginCoordinator(app);
    const sunita = await readySeller(app);
    const kamla = await readySeller(app);
    const buyer = await registerAs(app, 'buyer');
    const sunitaListing = await listingOf(sunita);
    const kamlaListing = await listingOf(kamla, { pricePerUnitPaise: 1000_00 });
    return { coordinator, sunita, kamla, buyer, sunitaListing, kamlaListing };
  }

  it('per-seller dues and monthly totals; marking collected cannot be counted twice', async () => {
    const clock = createClock('2026-11-10T06:00:00Z');
    const app = createMarketTestApp({ now: clock.now });
    const { coordinator, sunita, kamla, buyer, sunitaListing, kamlaListing } = await ledgerSetup(app);
    await completedOrder(sunita, buyer.agent, sunitaListing, 4); // ₹10,000 → ₹300
    await completedOrder(kamla, buyer.agent, kamlaListing, 1); // ₹1,000 → ₹30
    clock.set('2026-12-02T06:00:00Z');
    await completedOrder(sunita, buyer.agent, sunitaListing, 2); // ₹5,000 → ₹150 (December)

    const november = (await coordinator.agent.get('/api/admin/commission').query({ month: '2026-11' })).body.items;
    expect(november.map((row: { sellerId: string; duePaise: number }) => [row.sellerId, row.duePaise])).toEqual([
      [sunita.user.id, 300_00],
      [kamla.user.id, 30_00],
    ]);

    const months = (await coordinator.agent.get('/api/admin/commission/months')).body.items;
    expect(months).toEqual([
      { month: '2026-12', orders: 1, salesPaise: 5000_00, commissionPaise: 150_00, collectedPaise: 0, duePaise: 150_00 },
      { month: '2026-11', orders: 2, salesPaise: 11_000_00, commissionPaise: 330_00, collectedPaise: 0, duePaise: 330_00 },
    ]);

    const [first, second] = await Promise.all([
      coordinator.agent.post('/api/admin/commission/collect').send({ sellerId: sunita.user.id, month: '2026-11' }),
      coordinator.agent.post('/api/admin/commission/collect').send({ sellerId: sunita.user.id, month: '2026-11' }),
    ]);
    expect([first.body.amountPaise, second.body.amountPaise].sort()).toEqual([0, 300_00]);

    const allTime = (await coordinator.agent.get('/api/admin/commission')).body.items;
    expect(allTime.find((row: { sellerId: string }) => row.sellerId === sunita.user.id)).toMatchObject({
      commissionPaise: 450_00,
      collectedPaise: 300_00,
      duePaise: 150_00,
    });
    expect(await CommissionEntryModel.countDocuments({ status: 'collected' })).toBe(1);
  });

  it('exports the ledger as CSV for Excel, safe against formula injection', async () => {
    const app = createMarketTestApp({ now: createClock('2026-11-10T06:00:00Z').now });
    const { coordinator, sunita, buyer, sunitaListing } = await ledgerSetup(app);
    await completedOrder(sunita, buyer.agent, sunitaListing, 4);

    const res = await coordinator.agent.get('/api/admin/commission/export.csv').query({ month: '2026-11' });
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('agriai-commission-2026-11.csv');
    const lines = res.text.replace(/^\uFEFF/, '').trim().split('\r\n');
    expect(lines[0]).toBe('month,completed_at,order_ref,seller,village,seller_phone,order_total_inr,rate_percent,commission_inr,status,collected_at');
    expect(lines[1]).toContain(',सुनीता देवी,घांघू,');
    expect(lines[1]).toContain(',10000.00,3.00,300.00,due,');
    expect((await coordinator.agent.get('/api/admin/commission/export.csv').query({ month: '2026-13' })).status).toBe(400);

    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('+91 98')).toBe("'+91 98");
    expect(csvCell('a,b')).toBe('"a,b"');
  });

  it('stats add up', async () => {
    const app = createMarketTestApp();
    const { coordinator, sunita, buyer, sunitaListing } = await ledgerSetup(app);
    await completedOrder(sunita, buyer.agent, sunitaListing, 4);
    await buyer.agent.post('/api/market/orders').send({ listingId: sunitaListing, quantity: 1, fulfilment: 'pickup', paymentMethod: 'cash' });
    await readySeller(app, { verified: false });

    const stats = (await coordinator.agent.get('/api/admin/stats')).body;
    expect(stats).toMatchObject({
      sellers: { total: 3, pending: 1, verified: 2, rejected: 0 },
      buyers: 1,
      listings: { total: 2, visible: 2 },
      orders: { total: 2, open: 1, completed: 1, byStatus: { completed: 1, requested: 1 } },
      salesPaise: 10_000_00,
      commission: { totalPaise: 300_00, collectedPaise: 0, duePaise: 300_00 },
      openReports: 0,
      commissionPercent: 3,
    });
  });
});
