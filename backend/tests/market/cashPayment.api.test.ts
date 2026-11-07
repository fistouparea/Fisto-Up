import { describe, expect, it } from 'vitest';
import { AuditLogModel } from '../../src/modules/audit/audit.model.js';
import { UserModel } from '../../src/modules/auth/user.model.js';
import { CommissionEntryModel } from '../../src/modules/commission/commission.model.js';
import { ListingModel } from '../../src/modules/listings/listing.model.js';
import { setSellerStatus } from '../../src/modules/sellers/seller.service.js';
import { useTestDatabase } from '../setup/testDatabase.js';
import { client, createMarketTestApp, loginCoordinator, nextPhone, readySeller, registerAs, sellerProfile } from './marketHelpers.js';

useTestDatabase();

type App = ReturnType<typeof createMarketTestApp>;
type Agent = Awaited<ReturnType<typeof registerAs>>['agent'];

const { upiId: _upiId, ...profileWithoutUpi } = sellerProfile;

const bajra = {
  category: 'crop',
  product: 'bajra',
  unit: 'quintal',
  quantity: 10,
  pricePerUnitPaise: 2500_00,
  title: { hi: 'साफ़ बाजरा', en: 'Clean Bajra' },
};

/** A verified seller without a UPI ID (paid in cash at delivery) with one bajra listing. */
async function cashOnlySeller(app: App) {
  const seller = await registerAs(app, 'seller');
  const saved = await seller.agent.put('/api/account/seller-profile').send(profileWithoutUpi);
  expect(saved.status).toBe(200);
  await verify(seller.user.id);
  const listing = await seller.agent.post('/api/market/listings').send(bajra);
  expect(listing.status).toBe(201);
  return { ...seller, listingId: listing.body.listing.id as string };
}

/** A verified seller with a UPI ID and one bajra listing. */
async function upiSeller(app: App) {
  const seller = await readySeller(app);
  const listing = await seller.agent.post('/api/market/listings').send(bajra);
  expect(listing.status).toBe(201);
  return { ...seller, listingId: listing.body.listing.id as string };
}

async function verify(sellerId: string) {
  const coordinator = await UserModel.findOne({ role: 'coordinator' }).exec();
  await setSellerStatus(sellerId, { status: 'verified' }, (coordinator?._id ?? sellerId).toString());
}

function order(buyer: Agent, listingId: string, paymentMethod: 'upi' | 'cash') {
  return buyer.post('/api/market/orders').send({ listingId, quantity: 2, fulfilment: 'delivery', deliveryAddress: 'वार्ड 7, रतनगढ़', paymentMethod });
}

function move(agent: Agent, orderId: string, to: string, extra: Record<string, unknown> = {}) {
  return agent.post(`/api/market/orders/${orderId}/status`).send({ to, ...extra });
}

function setCash(coordinator: Agent, state: 'off' | 'all') {
  return coordinator.put('/api/admin/flags/cashPayment').send({ state });
}

const searchIds = async (app: App) => ((await client(app).get('/api/market/listings')).body.items as { id: string }[]).map((item) => item.id);

describe('seller registration without a UPI ID (cash payment on, the default)', () => {
  it('accepts a profile without a UPI ID (left out or empty) and the seller can list', async () => {
    const app = createMarketTestApp();
    for (const body of [profileWithoutUpi, { ...profileWithoutUpi, upiId: '  ' }]) {
      const seller = await registerAs(app, 'seller');
      const res = await seller.agent.put('/api/account/seller-profile').send(body);
      expect(res.status).toBe(200);
      expect(res.body.user.seller).toMatchObject({ profileComplete: true, upiNeeded: false });
      expect(res.body.user.seller).not.toHaveProperty('upiId');
      expect((await seller.agent.post('/api/market/listings').send(bajra)).status).toBe(201);
    }
  });

  it('still checks the format when a UPI ID is typed', async () => {
    const app = createMarketTestApp();
    const seller = await registerAs(app, 'seller');
    for (const upiId of ['9876543210', 'ramesh@', '@ybl', 'a b@ybl']) {
      expect((await seller.agent.put('/api/account/seller-profile').send({ ...profileWithoutUpi, upiId })).status).toBe(400);
    }
  });

  it('the public listing says "cash only" for a seller without a UPI ID, and never contains a UPI ID', async () => {
    const app = createMarketTestApp();
    await loginCoordinator(app);
    const cash = await cashOnlySeller(app);
    const upi = await upiSeller(app);

    const items = (await client(app).get('/api/market/listings')).body.items as { id: string; seller: { cashOnly: boolean } }[];
    expect(items.find((item) => item.id === cash.listingId)?.seller.cashOnly).toBe(true);
    expect(items.find((item) => item.id === upi.listingId)?.seller.cashOnly).toBe(false);
    expect(JSON.stringify(items)).not.toMatch(/okaxis|upi/i);
  });
});

describe('order flow, both payment paths', () => {
  it('seller without UPI: only cash at delivery; no UPI link or QR; "पैसे मिल गए" and commission work', async () => {
    const app = createMarketTestApp();
    await loginCoordinator(app);
    const seller = await cashOnlySeller(app);
    const buyer = await registerAs(app, 'buyer');

    const upiOrder = await order(buyer.agent, seller.listingId, 'upi');
    expect(upiOrder.status).toBe(400);
    expect(upiOrder.body.error.code).toBe('PAYMENT_METHOD_UNAVAILABLE');

    const placed = await order(buyer.agent, seller.listingId, 'cash');
    expect(placed.status).toBe(201);
    const id = placed.body.order.id as string;
    for (const to of ['accepted', 'ready', 'out_for_delivery']) expect((await move(seller.agent, id, to)).status).toBe(200);

    const seen = await buyer.agent.get(`/api/market/orders/${id}`);
    expect(seen.body.order.paymentMethod).toBe('cash');
    expect(seen.body.order.payment).toEqual({ payeeName: 'सुनीता देवी', amountPaise: 5000_00 });
    expect(JSON.stringify(seen.body)).not.toMatch(/upi/i);

    expect((await move(buyer.agent, id, 'delivered')).status).toBe(200);
    const paid = await move(seller.agent, id, 'paid');
    expect(paid.body.order).toMatchObject({ status: 'paid', paidVia: 'cash' });
    expect((await move(buyer.agent, id, 'completed')).status).toBe(200);

    const entry = await CommissionEntryModel.findOne({ orderId: id }).lean();
    expect(entry).toMatchObject({ sellerId: expect.anything(), orderTotalPaise: 5000_00, amountPaise: 150_00 });
    expect(entry?.sellerId.toString()).toBe(seller.user.id);
  });

  it('seller with UPI: UPI (link + QR data for the buyer) and cash at delivery both work', async () => {
    const app = createMarketTestApp();
    await loginCoordinator(app);
    const seller = await upiSeller(app);
    const buyer = await registerAs(app, 'buyer');

    const upiOrder = await order(buyer.agent, seller.listingId, 'upi');
    expect(upiOrder.status).toBe(201);
    await move(seller.agent, upiOrder.body.order.id, 'accepted');
    const seen = await buyer.agent.get(`/api/market/orders/${upiOrder.body.order.id}`);
    expect(seen.body.order.payment).toMatchObject({ upiId: 'sunita@okaxis', amountPaise: 5000_00 });
    expect(seen.body.order.payment.upiLink).toMatch(/^upi:\/\/pay\?pa=sunita%40okaxis/);
    expect((await move(seller.agent, upiOrder.body.order.id, 'ready')).status).toBe(200);

    const cashOrder = await order(buyer.agent, seller.listingId, 'cash');
    expect(cashOrder.status).toBe(201);
    expect(cashOrder.body.order.paymentMethod).toBe('cash');
  });
});

describe('adding a UPI ID later', () => {
  it('from "मेरा खाता": a verified seller goes back to "pending" until a coordinator checks the new ID', async () => {
    const app = createMarketTestApp();
    await loginCoordinator(app);
    const seller = await cashOnlySeller(app);
    expect(await searchIds(app)).toContain(seller.listingId);

    const res = await seller.agent.put('/api/account/seller-profile').send({ ...profileWithoutUpi, upiId: 'kamla@ybl' });
    expect(res.status).toBe(200);
    expect(res.body.user.seller).toMatchObject({ status: 'pending', upiId: 'kamla@ybl' });
    expect(await searchIds(app)).not.toContain(seller.listingId);

    await verify(seller.user.id);
    expect(await searchIds(app)).toContain(seller.listingId);
    const buyer = await registerAs(app, 'buyer');
    expect((await order(buyer.agent, seller.listingId, 'upi')).status).toBe(201);
  });

  it('removing the UPI ID needs no new check (the seller is then paid in cash)', async () => {
    const app = createMarketTestApp();
    const seller = await readySeller(app);
    const res = await seller.agent.put('/api/account/seller-profile').send(profileWithoutUpi);
    expect(res.body.user.seller).toMatchObject({ status: 'verified' });
    expect(res.body.user.seller).not.toHaveProperty('upiId');
  });

  it('by a coordinator from the admin panel: no new check, audited without the ID itself', async () => {
    const app = createMarketTestApp();
    const coordinator = await loginCoordinator(app);
    const seller = await cashOnlySeller(app);

    expect((await seller.agent.put(`/api/admin/sellers/${seller.user.id}/upi`).send({ upiId: 'kamla@ybl' })).status).toBe(403);
    expect((await coordinator.agent.put(`/api/admin/sellers/${seller.user.id}/upi`).send({ upiId: 'not-a-upi' })).status).toBe(400);

    const res = await coordinator.agent.put(`/api/admin/sellers/${seller.user.id}/upi`).send({ upiId: 'kamla@ybl' });
    expect(res.status).toBe(200);
    expect(res.body.seller).toMatchObject({ status: 'verified', upiId: 'kamla@ybl', upiNeeded: false });

    const entry = await AuditLogModel.findOne({ action: 'seller.setUpi' }).lean();
    expect(entry).toMatchObject({ actorId: expect.anything(), target: { type: 'user', id: seller.user.id }, details: { hadUpi: false } });
    expect(JSON.stringify(entry)).not.toContain('kamla@ybl');
  });

  it('a coordinator may sign up a seller without a UPI ID', async () => {
    const app = createMarketTestApp();
    const coordinator = await loginCoordinator(app);
    const res = await coordinator.agent.post('/api/admin/sellers').send({ ...profileWithoutUpi, phone: nextPhone(), pin: '8264' });
    expect(res.status).toBe(201);
    expect(res.body.seller).toMatchObject({ status: 'verified', profileComplete: true, upiNeeded: false });
    expect(res.body.seller).not.toHaveProperty('upiId');
  });
});

describe('feature flag cashPayment', () => {
  it('is on for everyone by default, and only off/all can be chosen', async () => {
    const app = createMarketTestApp();
    const coordinator = await loginCoordinator(app);
    expect((await client(app).get('/api/account/flags')).body.flags.cashPayment).toBe(true);

    const flags = (await coordinator.agent.get('/api/admin/flags')).body.items as { key: string; state: string; onOff: boolean }[];
    expect(flags.find((flag) => flag.key === 'cashPayment')).toMatchObject({ state: 'all', onOff: true });
    expect(flags.find((flag) => flag.key === 'voiceMode')?.onOff).toBe(false);
    expect((await coordinator.agent.put('/api/admin/flags/cashPayment').send({ state: 'pilot' })).status).toBe(400);
  });

  it('OFF: listings of sellers without UPI are hidden at once, the seller is told, cash orders are refused', async () => {
    const app = createMarketTestApp();
    const coordinator = await loginCoordinator(app);
    const cash = await cashOnlySeller(app);
    const upi = await upiSeller(app);
    const buyer = await registerAs(app, 'buyer');

    const off = await setCash(coordinator.agent, 'off');
    expect(off.status).toBe(200);
    expect((await client(app).get('/api/account/flags')).body.flags.cashPayment).toBe(false);
    const audited = await AuditLogModel.findOne({ action: 'flag.set', 'target.id': 'cashPayment' }).lean();
    expect(audited?.details).toMatchObject({ state: 'off', listingsChanged: 1 });

    // Hidden for buyers: search, the listing page, ordering.
    const ids = await searchIds(app);
    expect(ids).not.toContain(cash.listingId);
    expect(ids).toContain(upi.listingId);
    expect((await client(app).get(`/api/market/listings/${cash.listingId}`)).status).toBe(404);
    expect((await order(buyer.agent, cash.listingId, 'cash')).status).toBe(404);

    // Buyers pay only by UPI.
    const refused = await order(buyer.agent, upi.listingId, 'cash');
    expect(refused.status).toBe(400);
    expect(refused.body.error.code).toBe('PAYMENT_METHOD_UNAVAILABLE');
    expect((await order(buyer.agent, upi.listingId, 'upi')).status).toBe(201);

    // The seller sees the notice and cannot add listings until there is a UPI ID.
    const me = await cash.agent.get('/api/auth/me');
    expect(me.body.user.seller).toMatchObject({ upiNeeded: true, profileComplete: false });
    const listed = await cash.agent.post('/api/market/listings').send(bajra);
    expect(listed.status).toBe(403);
    expect(listed.body.error.code).toBe('SELLER_PROFILE_MISSING');

    // The coordinator finds them in the panel.
    const missing = await coordinator.agent.get('/api/admin/sellers').query({ upi: 'missing' });
    expect((missing.body.items as { id: string; upiNeeded: boolean }[]).map((item) => [item.id, item.upiNeeded])).toEqual([[cash.user.id, true]]);
  });

  it('OFF: new sellers need a UPI ID again (self sign-up and coordinator sign-up)', async () => {
    const app = createMarketTestApp();
    const coordinator = await loginCoordinator(app);
    await setCash(coordinator.agent, 'off');

    const seller = await registerAs(app, 'seller');
    const res = await seller.agent.put('/api/account/seller-profile').send(profileWithoutUpi);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('UPI_REQUIRED');
    expect((await seller.agent.put('/api/account/seller-profile').send(sellerProfile)).status).toBe(200);

    const phone = nextPhone();
    const assisted = await coordinator.agent.post('/api/admin/sellers').send({ ...profileWithoutUpi, phone, pin: '8264' });
    expect(assisted.status).toBe(400);
    expect(assisted.body.error.code).toBe('UPI_REQUIRED');
    expect(await UserModel.countDocuments({ phone })).toBe(0);
  });

  it('OFF: a UPI ID from the coordinator (or the seller, after the check) makes the listing visible again', async () => {
    const app = createMarketTestApp();
    const coordinator = await loginCoordinator(app);
    const byCoordinator = await cashOnlySeller(app);
    const bySeller = await cashOnlySeller(app);
    await setCash(coordinator.agent, 'off');

    await coordinator.agent.put(`/api/admin/sellers/${byCoordinator.user.id}/upi`).send({ upiId: 'kamla@ybl' });
    expect(await searchIds(app)).toContain(byCoordinator.listingId);

    const saved = await bySeller.agent.put('/api/account/seller-profile').send({ ...profileWithoutUpi, upiId: 'geeta@ybl' });
    expect(saved.body.user.seller).toMatchObject({ status: 'pending', upiNeeded: false });
    expect(await searchIds(app)).not.toContain(bySeller.listingId);
    await verify(bySeller.user.id);
    expect(await searchIds(app)).toContain(bySeller.listingId);
  });

  it('back ON: hidden listings come back and cash works again; running cash orders finish either way', async () => {
    const app = createMarketTestApp();
    const coordinator = await loginCoordinator(app);
    const seller = await cashOnlySeller(app);
    const buyer = await registerAs(app, 'buyer');
    const running = await order(buyer.agent, seller.listingId, 'cash');
    await move(seller.agent, running.body.order.id, 'accepted');

    await setCash(coordinator.agent, 'off');
    expect((await ListingModel.findById(seller.listingId).lean())?.paymentBlocked).toBe(true);
    for (const to of ['ready', 'out_for_delivery']) expect((await move(seller.agent, running.body.order.id, to)).status).toBe(200);
    expect((await move(buyer.agent, running.body.order.id, 'delivered')).status).toBe(200);
    expect((await move(seller.agent, running.body.order.id, 'paid')).body.order.paidVia).toBe('cash');

    const on = await setCash(coordinator.agent, 'all');
    expect(on.status).toBe(200);
    expect(await searchIds(app)).toContain(seller.listingId);
    expect((await order(buyer.agent, seller.listingId, 'cash')).status).toBe(201);
    expect((await seller.agent.get('/api/auth/me')).body.user.seller).toMatchObject({ upiNeeded: false, profileComplete: true });
  });
});
