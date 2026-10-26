import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { flagDefaults } from '../../src/config/featureFlags.js';
import { isBlockedInput } from '../../src/config/inputRules.js';
import { matchInputGeneric } from '../../src/data/inputGenerics.js';
import { FeatureFlags } from '../../src/modules/flags/flag.service.js';
import { CommissionEntryModel } from '../../src/modules/commission/commission.model.js';
import { useTestDatabase } from '../setup/testDatabase.js';
import { createMarketTestApp, loginCoordinator, registerAs, sellerProfile } from './marketHelpers.js';

useTestDatabase();

type App = ReturnType<typeof createMarketTestApp>;

const kitOn = () => new FeatureFlags({ ...flagDefaults(undefined), aiKit: 'all' });
const dealerProfile = { ...sellerProfile, name: 'किसान सेवा केंद्र', kind: 'input_dealer', licenceNumber: 'RJ/CHU/2026-118' };
const mancozebListing = {
  category: 'input',
  product: 'fungicide',
  genericId: 'mancozeb',
  unit: 'pack',
  quantity: 40,
  pricePerUnitPaise: 320_00,
  title: { hi: 'मैंकोजेब 75% WP – 500 ग्राम' },
};

/** A dealer with a complete profile; licence checked and verified by a coordinator unless `verified: false`. */
async function dealer(app: App, { verified = true, pickup = sellerProfile.pickup }: { verified?: boolean; pickup?: typeof sellerProfile.pickup } = {}) {
  const seller = await registerAs(app, 'seller');
  const saved = await seller.agent.put('/api/account/seller-profile').send({ ...dealerProfile, pickup });
  expect(saved.status).toBe(200);
  if (verified) {
    const coordinator = await loginCoordinator(app);
    expect((await coordinator.agent.post(`/api/admin/sellers/${seller.user.id}/verify`).send({ licenceChecked: true })).status).toBe(200);
  }
  return seller;
}

describe('generic name matching and blocklist', () => {
  it('matches Hindi and English spellings to one generic, never a brand', () => {
    expect(matchInputGeneric('मैंकोजेब')).toBe('mancozeb');
    expect(matchInputGeneric('मैंकोजेब (Mancozeb) का घोल')).toBe('mancozeb');
    expect(matchInputGeneric('Imidacloprid 17.8 SL')).toBe('imidacloprid');
    expect(matchInputGeneric('जिंक सल्फेट')).toBe('zinc_sulphate');
    expect(matchInputGeneric('नीम का तेल')).toBe('neem_oil');
    expect(matchInputGeneric('adapter')).toBeNull(); // "dap" only as a whole word
    expect(matchInputGeneric('कोई अनजान दवा')).toBeNull();
  });

  it('blocks banned, red-label and restricted inputs in any spelling', () => {
    expect(isBlockedInput('Monocrotophos 36 SL')).toBe(true);
    expect(isBlockedInput('फोरेट 10 G')).toBe(true);
    expect(isBlockedInput('सल्फास की गोली')).toBe(true);
    expect(isBlockedInput('Glyphosate 41%')).toBe(true);
    expect(isBlockedInput('मैंकोजेब')).toBe(false);
  });
});

describe('input dealers', () => {
  it('need a licence number in the profile', async () => {
    const app = createMarketTestApp();
    const seller = await registerAs(app, 'seller');
    const res = await seller.agent.put('/api/account/seller-profile').send({ ...dealerProfile, licenceNumber: undefined });
    expect(res.status).toBe(400);
  });

  it('cannot be verified without the licence check, and cannot list before it', async () => {
    const app = createMarketTestApp();
    const seller = await dealer(app, { verified: false });
    expect((await seller.agent.post('/api/market/listings').send(mancozebListing)).body.error.code).toBe('LICENCE_NOT_VERIFIED');

    const coordinator = await loginCoordinator(app);
    const noCheck = await coordinator.agent.post(`/api/admin/sellers/${seller.user.id}/verify`).send({});
    expect(noCheck.status).toBe(400);
    expect(noCheck.body.error.code).toBe('LICENCE_CHECK_REQUIRED');

    const verified = await coordinator.agent.post(`/api/admin/sellers/${seller.user.id}/verify`).send({ licenceChecked: true });
    expect(verified.body.seller).toMatchObject({ kind: 'input_dealer', licenceNumber: 'RJ/CHU/2026-118', licenceVerified: true });
    expect((await seller.agent.post('/api/market/listings').send(mancozebListing)).status).toBe(201);
  });

  it('a new licence number sends the dealer back to pending', async () => {
    const app = createMarketTestApp();
    const seller = await dealer(app);
    const res = await seller.agent.put('/api/account/seller-profile').send({ ...dealerProfile, licenceNumber: 'RJ/CHU/2026-999' });
    expect(res.body.user.seller).toMatchObject({ status: 'pending', licenceVerified: false });
  });

  it('list only inputs; producers never list inputs', async () => {
    const app = createMarketTestApp();
    const seller = await dealer(app);
    const bajra = { category: 'crop', product: 'bajra', unit: 'quintal', quantity: 5, pricePerUnitPaise: 2500_00, title: { hi: 'बाजरा' } };
    expect((await seller.agent.post('/api/market/listings').send(bajra)).status).toBe(400);

    const producer = await registerAs(app, 'seller');
    await producer.agent.put('/api/account/seller-profile').send(sellerProfile);
    expect((await producer.agent.post('/api/market/listings').send(mancozebListing)).status).toBe(403);
  });

  it('medicines need a fitting generic name; blocked inputs are refused', async () => {
    const app = createMarketTestApp();
    const seller = await dealer(app);
    expect((await seller.agent.post('/api/market/listings').send({ ...mancozebListing, genericId: undefined })).status).toBe(400);
    expect((await seller.agent.post('/api/market/listings').send({ ...mancozebListing, genericId: 'urea' })).status).toBe(400);
    const banned = await seller.agent.post('/api/market/listings').send({ ...mancozebListing, title: { hi: 'मोनोक्रोटोफॉस 36 SL' } });
    expect(banned.body.error.code).toBe('BLOCKED_INPUT');
  });
});

describe('GET /api/market/inputs/kit', () => {
  it('is off unless the aiKit flag allows it (pilot by default)', async () => {
    const app = createMarketTestApp();
    expect((await request(app).get('/api/market/inputs/kit?name=मैंकोजेब')).status).toBe(403);
  });

  it('shows generic names with nearby verified dealer products, labelled as partner', async () => {
    const app = createMarketTestApp({}, { flags: kitOn() });
    const near = await dealer(app);
    await near.agent.post('/api/market/listings').send(mancozebListing);
    // 200+ km away: outside the kit radius.
    const far = await dealer(app, { pickup: { district: 'जयपुर', tehsil: 'जयपुर', lat: 26.9, lon: 75.8 } });
    await far.agent.post('/api/market/listings').send({ ...mancozebListing, title: { hi: 'दूर वाली दुकान का मैंकोजेब' } });
    const pending = await dealer(app, { verified: false });
    expect((await pending.agent.post('/api/market/listings').send(mancozebListing)).status).toBe(403);

    const res = await request(app).get('/api/market/inputs/kit').query({ name: ['मैंकोजेब', 'कोई देसी उपाय'], lat: 28.31, lon: 74.96 });
    expect(res.status).toBe(200);
    expect(res.body.radiusKm).toBe(50);
    const [mancozeb, unknown] = res.body.items;
    expect(mancozeb.generic).toMatchObject({ id: 'mancozeb' });
    expect(mancozeb.products).toHaveLength(1);
    expect(mancozeb.products[0]).toMatchObject({ partner: true, genericId: 'mancozeb', title: { hi: mancozebListing.title.hi } });
    expect(JSON.stringify(mancozeb.products[0])).not.toMatch(/upi|phone/i);
    expect(unknown).toMatchObject({ generic: null, products: [] });
  });

  it('never shows a banned name from a diagnosis', async () => {
    const app = createMarketTestApp({}, { flags: kitOn() });
    const res = await request(app).get('/api/market/inputs/kit').query({ name: ['फोरेट', 'यूरिया'] });
    expect(res.body.items.map((item: { name: string }) => item.name)).toEqual(['यूरिया']);
  });

  it('validates the query', async () => {
    const app = createMarketTestApp({}, { flags: kitOn() });
    expect((await request(app).get('/api/market/inputs/kit')).status).toBe(400);
    expect((await request(app).get('/api/market/inputs/kit').query({ name: 'x', lat: 28 })).status).toBe(400);
  });
});

describe('partner referral', () => {
  it('a kit order is recorded in the ledger as its own type', async () => {
    const app = createMarketTestApp({}, { flags: kitOn() });
    const seller = await dealer(app);
    const listingId = (await seller.agent.post('/api/market/listings').send(mancozebListing)).body.listing.id as string;
    const buyer = await registerAs(app, 'buyer');
    const placed = await buyer.agent
      .post('/api/market/orders')
      .send({ listingId, quantity: 2, fulfilment: 'pickup', paymentMethod: 'cash', referral: 'ai_kit' });
    expect(placed.status).toBe(201);
    expect(placed.body.order.referral).toBe('ai_kit');
    const orderId = placed.body.order.id as string;

    for (const [agent, to] of [
      [seller.agent, 'accepted'],
      [seller.agent, 'ready'],
      [seller.agent, 'ready_for_pickup'],
      [buyer.agent, 'delivered'],
      [seller.agent, 'paid'],
      [buyer.agent, 'completed'],
    ] as const) {
      expect((await agent.post(`/api/market/orders/${orderId}/status`).send({ to })).status, to).toBe(200);
    }
    const entry = await CommissionEntryModel.findOne({ orderId }).lean().exec();
    expect(entry).toMatchObject({ type: 'partner_referral', amountPaise: 19_20 });

    const coordinator = await loginCoordinator(app);
    const referrals = await coordinator.agent.get('/api/admin/commission/referrals');
    expect(referrals.body.items).toHaveLength(1);
    expect(referrals.body.items[0]).toMatchObject({ orders: 1, commissionPaise: 19_20 });
  });

  it('a referral is only accepted for farm inputs', async () => {
    const app = createMarketTestApp();
    const producer = await registerAs(app, 'seller');
    await producer.agent.put('/api/account/seller-profile').send(sellerProfile);
    const coordinator = await loginCoordinator(app);
    await coordinator.agent.post(`/api/admin/sellers/${producer.user.id}/verify`).send({});
    const bajra = { category: 'crop', product: 'bajra', unit: 'quintal', quantity: 5, pricePerUnitPaise: 2500_00, title: { hi: 'बाजरा' } };
    const listingId = (await producer.agent.post('/api/market/listings').send(bajra)).body.listing.id as string;
    const buyer = await registerAs(app, 'buyer');
    const res = await buyer.agent.post('/api/market/orders').send({ listingId, quantity: 1, fulfilment: 'pickup', paymentMethod: 'cash', referral: 'ai_kit' });
    expect(res.status).toBe(400);
  });
});
