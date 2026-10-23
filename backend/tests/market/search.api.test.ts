import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { UserModel } from '../../src/modules/auth/user.model.js';
import { distanceKm, escapeRegex } from '../../src/modules/listings/listing.search.js';
import { useTestDatabase } from '../setup/testDatabase.js';
import { createMarketTestApp, readySeller, sellerProfile } from './marketHelpers.js';

useTestDatabase();

const CHURU = { lat: 28.3, lon: 74.95 };
const SUJANGARH = { lat: 27.7, lon: 74.47 }; // ~80 km from Churu

type App = ReturnType<typeof createMarketTestApp>;

async function sellerAt(app: App, place: { lat: number; lon: number; tehsil: string }) {
  const seller = await readySeller(app);
  await seller.agent.put('/api/account/seller-profile').send({ ...sellerProfile, pickup: { district: 'चूरू', ...place } });
  return seller;
}

async function seed(app: App) {
  const churu = await sellerAt(app, { ...CHURU, tehsil: 'चूरू' });
  const sujangarh = await sellerAt(app, { ...SUJANGARH, tehsil: 'सुजानगढ़' });
  const add = (agent: typeof churu.agent, body: Record<string, unknown>) =>
    agent.post('/api/market/listings').send({ category: 'crop', unit: 'quintal', quantity: 10, title: { hi: 'x' }, ...body });

  await add(churu.agent, { product: 'bajra', pricePerUnitPaise: 2500_00, title: { hi: 'साफ़ बाजरा', en: 'Clean Bajra' } });
  await add(churu.agent, { product: 'guar', pricePerUnitPaise: 5000_00, quantity: 50, minOrderQty: 10, title: { hi: 'ग्वार थोक' } });
  await add(sujangarh.agent, { product: 'bajra', pricePerUnitPaise: 2300_00, quantity: 3, title: { hi: 'बाजरा', en: 'Bajra' } });
  await add(sujangarh.agent, {
    category: 'shg',
    product: 'achar',
    unit: 'pack',
    pricePerUnitPaise: 120_00,
    title: { hi: 'आम का अचार', en: 'Mango pickle' },
  });
  return { churu, sujangarh };
}

const titles = (res: request.Response) => res.body.items.map((item: { title: { hi: string } }) => item.title.hi);

describe('browsing the marketplace (no login needed)', () => {
  it('lists visible listings newest first, without any phone number or UPI ID', async () => {
    const app = createMarketTestApp();
    await seed(app);
    const res = await request(app).get('/api/market/listings');

    expect(res.status).toBe(200);
    expect(titles(res)).toEqual(['आम का अचार', 'बाजरा', 'ग्वार थोक', 'साफ़ बाजरा']);
    expect(res.body.items[0].seller).toMatchObject({ name: 'सुनीता देवी', village: 'घांघू', verified: true, rating: { average: null, count: 0 } });
    const json = JSON.stringify(res.body);
    expect(json).not.toMatch(/okaxis|upi|phone|98\d{8}/i);
  });

  it('hides paused, sold out, hidden and unverified sellers’ listings', async () => {
    const app = createMarketTestApp();
    const { churu } = await seed(app);
    const mine = (await churu.agent.get('/api/market/my/listings')).body.items as { id: string }[];
    await churu.agent.patch(`/api/market/listings/${mine[0]?.id}`).send({ status: 'paused' });
    await UserModel.updateOne({ _id: churu.user.id }, { 'seller.status': 'pending' });
    await churu.agent.put('/api/account/seller-profile').send({ ...sellerProfile, pickup: { ...CHURU, tehsil: 'चूरू' } });

    expect(titles(await request(app).get('/api/market/listings'))).toEqual(['आम का अचार', 'बाजरा']);
  });

  it.each([
    ['category', { category: 'shg' }, ['आम का अचार']],
    ['product', { product: 'bajra' }, ['बाजरा', 'साफ़ बाजरा']],
    ['Hindi search on the product name', { q: 'बाजरा' }, ['बाजरा', 'साफ़ बाजरा']],
    ['English search on the title', { q: 'mango' }, ['आम का अचार']],
    ['price range (paise)', { minPrice: 2400_00, maxPrice: 5000_00 }, ['ग्वार थोक', 'साफ़ बाजरा']],
    ['minimum available quantity', { minQty: 20 }, ['ग्वार थोक']],
    ['bulk (B2B) only', { bulk: 'true' }, ['ग्वार थोक']],
    ['distance from Churu', { lat: CHURU.lat, lon: CHURU.lon, radiusKm: 30 }, ['ग्वार थोक', 'साफ़ बाजरा']],
  ])('filters by %s', async (_label, query, expected) => {
    const app = createMarketTestApp();
    await seed(app);
    expect(titles(await request(app).get('/api/market/listings').query(query))).toEqual(expected);
  });

  it('sorts by price and shows the distance when the buyer gives a location', async () => {
    const app = createMarketTestApp();
    await seed(app);
    const res = await request(app).get('/api/market/listings').query({ sort: 'price_asc', product: 'bajra', ...CHURU });
    expect(titles(res)).toEqual(['बाजरा', 'साफ़ बाजरा']);
    expect(res.body.items[0].distanceKm).toBeGreaterThan(70);
    expect(res.body.items[1].distanceKm).toBe(0);
  });

  it('treats search text as text, not as a pattern', async () => {
    const app = createMarketTestApp();
    await seed(app);
    const res = await request(app).get('/api/market/listings').query({ q: '.*' });
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
    expect(escapeRegex('a.b*')).toBe('a\\.b\\*');
  });

  it('rejects bad filters', async () => {
    const app = createMarketTestApp();
    expect((await request(app).get('/api/market/listings').query({ lat: 28 })).status).toBe(400);
    expect((await request(app).get('/api/market/listings').query({ product: 'gold' })).status).toBe(400);
    expect((await request(app).get('/api/market/listings').query({ q: 'x'.repeat(51) })).status).toBe(400);
  });

  it('pages through results', async () => {
    const app = createMarketTestApp();
    const { churu } = await seed(app);
    for (let i = 0; i < 20; i++) {
      await churu.agent.post('/api/market/listings').send({
        category: 'crop',
        product: 'moth',
        unit: 'kg',
        quantity: 5,
        pricePerUnitPaise: 80_00,
        title: { hi: `मोठ ${i}` },
      });
    }
    const first = await request(app).get('/api/market/listings');
    const second = await request(app).get('/api/market/listings').query({ page: 2 });
    expect(first.body).toMatchObject({ page: 1, hasMore: true });
    expect(first.body.items).toHaveLength(20);
    expect(second.body.items).toHaveLength(4);
    expect(second.body.hasMore).toBe(false);
  });
});

describe('listing page', () => {
  it('shows a visible listing to anyone, and a hidden one only to its seller and coordinators', async () => {
    const app = createMarketTestApp();
    const { churu } = await seed(app);
    const [listing] = (await churu.agent.get('/api/market/my/listings')).body.items as { id: string }[];

    const open = await request(app).get(`/api/market/listings/${listing?.id}`);
    expect(open.body.listing).toMatchObject({ id: listing?.id, place: { tehsil: 'चूरू' } });

    await churu.agent.patch(`/api/market/listings/${listing?.id}`).send({ status: 'paused' });
    expect((await request(app).get(`/api/market/listings/${listing?.id}`)).status).toBe(404);
    expect((await churu.agent.get(`/api/market/listings/${listing?.id}`)).status).toBe(200);
    expect((await request(app).get('/api/market/listings/not-an-id')).status).toBe(404);
  });

  it('distance helper is about right (Churu → Sujangarh ≈ 80 km)', () => {
    expect(distanceKm(CHURU, SUJANGARH)).toBeGreaterThan(70);
    expect(distanceKm(CHURU, SUJANGARH)).toBeLessThan(90);
  });
});
