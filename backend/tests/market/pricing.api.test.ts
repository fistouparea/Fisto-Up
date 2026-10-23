import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ListingModel } from '../../src/modules/listings/listing.model.js';
import { clearPriceCache, median } from '../../src/modules/pricing/pricing.service.js';
import type { MandiProvider } from '../../src/services/mandi/agmarknetProvider.js';
import type { MandiPrice } from '../../src/types/mandi.js';
import { createFakeProvider } from '../helpers.js';
import { useTestDatabase } from '../setup/testDatabase.js';
import { createMarketTestApp, readySeller, registerAs } from './marketHelpers.js';

useTestDatabase();
beforeEach(() => clearPriceCache());

const bajraPrice = (market: string, modalPrice: number, date = '2026-11-09'): MandiPrice => ({
  crop: 'bajra',
  market,
  modalPrice,
  minPrice: modalPrice - 100,
  maxPrice: modalPrice + 150,
  date,
});

function fakeMandi(prices: MandiPrice[] | Error): MandiProvider {
  return {
    getPrices: vi.fn(async () => {
      if (prices instanceof Error) throw prices;
      return prices;
    }),
  };
}

async function suggest(app: ReturnType<typeof createMarketTestApp>, product: string, unit: string) {
  const { agent } = await registerAs(app, 'seller');
  return agent.get('/api/market/pricing/suggest').query({ product, unit });
}

describe('crop price suggestion from mandi prices', () => {
  it('shows the latest mandi range per quintal and a fair range around the median', async () => {
    const mandi = fakeMandi([
      bajraPrice('चूरू', 2400),
      bajraPrice('रतनगढ़', 2500),
      bajraPrice('सरदारशहर', 2600),
      bajraPrice('चूरू', 9999, '2026-10-01'), // old data is ignored
    ]);
    const res = await suggest(createMarketTestApp({}, { mandi }), 'bajra', 'quintal');

    expect(res.body).toEqual({
      source: 'mandi',
      unit: 'quintal',
      mandiMinPaisePerQuintal: 2300_00,
      mandiMaxPaisePerQuintal: 2750_00,
      date: '2026-11-09',
      markets: ['चूरू', 'रतनगढ़', 'सरदारशहर'],
      fairMinPaise: 2375_00, // 2500 − 5%
      fairMaxPaise: 2625_00, // 2500 + 5%
    });
  });

  it('converts the fair range to per kg', async () => {
    const res = await suggest(createMarketTestApp({}, { mandi: fakeMandi([bajraPrice('चूरू', 2500)]) }), 'bajra', 'kg');
    expect(res.body).toMatchObject({ unit: 'kg', fairMinPaise: 23_75, fairMaxPaise: 26_25, mandiMinPaisePerQuintal: 2400_00 });
  });

  it('falls back to similar listings when mandi has nothing, and hides the suggestion when that is too little', async () => {
    const app = createMarketTestApp({}, { mandi: fakeMandi(new Error('Agmarknet down')) });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect((await suggest(app, 'bajra', 'quintal')).body).toEqual({ source: null });

    const { agent } = await readySeller(app);
    for (const price of [2200_00, 2400_00, 2600_00]) {
      await agent.post('/api/market/listings').send({
        category: 'crop',
        product: 'bajra',
        unit: 'quintal',
        quantity: 5,
        pricePerUnitPaise: price,
        title: { hi: 'बाजरा' },
      });
    }
    expect((await suggest(app, 'bajra', 'quintal')).body).toEqual({
      source: 'platform',
      unit: 'quintal',
      sampleSize: 3,
      fairMinPaise: 2040_00,
      fairMaxPaise: 2760_00,
    });
  });

  it('without a mandi key and without listings there is simply no suggestion', async () => {
    expect((await suggest(createMarketTestApp(), 'gehun', 'quintal')).body).toEqual({ source: null });
  });
});

describe('SHG price suggestion', () => {
  it('uses the median of similar visible listings when there are enough', async () => {
    const app = createMarketTestApp();
    const { agent } = await readySeller(app);
    for (const price of [100_00, 150_00, 200_00, 900_00]) {
      await agent.post('/api/market/listings').send({
        category: 'shg',
        product: 'achar',
        unit: 'kg',
        quantity: 5,
        pricePerUnitPaise: price,
        title: { hi: 'अचार' },
      });
    }
    await ListingModel.updateOne({ pricePerUnitPaise: 900_00 }, { status: 'paused' }); // not visible: not counted

    const res = await suggest(app, 'achar', 'kg');
    expect(res.body).toMatchObject({ source: 'platform', sampleSize: 3, fairMinPaise: 127_50, fairMaxPaise: 172_50 });
  });

  it('asks the AI with only the product name and unit when there are too few listings', async () => {
    const ai = createFakeProvider();
    const res = await suggest(createMarketTestApp({}, { aiProvider: ai }), 'papad', 'pack');

    expect(res.body).toEqual({ source: 'ai', unit: 'pack', fairMinPaise: 180_00, fairMaxPaise: 240_00 });
    expect(ai.estimatePrice).toHaveBeenCalledWith({ productName: 'पापड़ (Papad)', unit: 'pack' });
  });

  it.each([
    ['low confidence', { min_rupees: 100, max_rupees: 200, confidence: 'low' as const }],
    ['a range that makes no sense', { min_rupees: 300, max_rupees: 100, confidence: 'high' as const }],
    ['a far too wide range', { min_rupees: 10, max_rupees: 900, confidence: 'high' as const }],
  ])('hides an AI estimate with %s', async (_label, estimate) => {
    const ai = createFakeProvider(undefined, undefined, { estimatePrice: estimate });
    expect((await suggest(createMarketTestApp({}, { aiProvider: ai }), 'masala', 'kg')).body).toEqual({ source: null });
  });

  it('an AI failure only hides the suggestion', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const ai = createFakeProvider(undefined, undefined, { estimatePrice: new Error('quota') });
    const res = await suggest(createMarketTestApp({}, { aiProvider: ai }), 'handicraft', 'piece');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ source: null });
  });
});

describe('access and helpers', () => {
  it('only sellers and coordinators can ask, and the product must exist', async () => {
    const app = createMarketTestApp();
    const buyer = await registerAs(app, 'buyer');
    expect((await buyer.agent.get('/api/market/pricing/suggest').query({ product: 'bajra', unit: 'kg' })).status).toBe(403);
    expect((await suggest(app, 'gold', 'kg')).status).toBe(400);
  });

  it('median handles odd and even counts', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });
});
