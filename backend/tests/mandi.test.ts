import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { AgmarknetProvider, type MandiProvider } from '../src/services/mandi/agmarknetProvider.js';
import { todayInIndia } from '../src/utils/dates.js';
import { InMemoryFarmProfileRepository } from './fakes/inMemoryFarmProfileRepository.js';
import { createFakeProvider } from './helpers.js';

const records = [
  { market: 'Churu', commodity: 'Bengal Gram(Gram)(Whole)', arrival_date: '20/10/2026', min_price: '5200', max_price: '5600', modal_price: '5400' },
  { market: 'Sardarshahar', commodity: 'Mustard', arrival_date: '20/10/2026', min_price: 5800, max_price: 6100, modal_price: 6000 },
  { market: 'Jaipur (F&V)', commodity: 'Mustard', arrival_date: '20/10/2026', min_price: '5900', max_price: '6200', modal_price: '6100' },
  { market: 'Ratangarh', commodity: 'Onion', arrival_date: '20/10/2026', min_price: '900', max_price: '1200', modal_price: '1000' },
  { market: 'Churu', commodity: 'Wheat', arrival_date: 'bad date', min_price: '2300', max_price: '2400', modal_price: '2350' },
  { unexpected: 'shape' },
];

function provider(fetchImpl = async () => new Response(JSON.stringify({ records }))) {
  const fetchFn = vi.fn(fetchImpl);
  return { fetchFn, mandi: new AgmarknetProvider({ apiKey: 'KEY', fetchFn, now: () => new Date('2026-10-20T05:00:00Z') }) };
}

describe('AgmarknetProvider', () => {
  it('keeps nearby mandis and known crops only, in Hindi, with ISO dates', async () => {
    const { mandi, fetchFn } = provider();
    expect(await mandi.getPrices(['chana', 'sarson', 'gehun'])).toEqual([
      { crop: 'chana', market: 'चूरू', modalPrice: 5400, minPrice: 5200, maxPrice: 5600, date: '2026-10-20' },
      { crop: 'sarson', market: 'सरदारशहर', modalPrice: 6000, minPrice: 5800, maxPrice: 6100, date: '2026-10-20' },
    ]);
    const url = new URL(String((fetchFn.mock.calls[0] as unknown as [string])[0]));
    expect(url.searchParams.get('api-key')).toBe('KEY');
  });

  it('filters by the requested crops and caches', async () => {
    const { mandi, fetchFn } = provider();
    expect((await mandi.getPrices(['sarson'])).map((price) => price.crop)).toEqual(['sarson']);
    await mandi.getPrices(['chana']);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('throws on HTTP errors', async () => {
    const { mandi } = provider(async () => new Response('forbidden', { status: 403 }));
    await expect(mandi.getPrices(['chana'])).rejects.toThrow();
  });
});

describe('GET /api/mandi', () => {
  const DEVICE = randomUUID();

  async function appWith(mandi: MandiProvider | null) {
    const farmProfiles = new InMemoryFarmProfileRepository();
    await farmProfiles.save(DEVICE, { crops: [{ crop: 'chana', sowingDate: todayInIndia() }] });
    return createApp({ aiProvider: createFakeProvider(), historyRepository: null, farmProfiles, mandi, corsOrigins: [] });
  }

  it('is unavailable without an API key', async () => {
    const res = await request(await appWith(null)).get('/api/mandi').query({ deviceId: DEVICE });
    expect(res.body).toEqual({ available: false, prices: [] });
  });

  it('returns prices for the farmer\'s crops', async () => {
    const res = await request(await appWith(provider().mandi)).get('/api/mandi').query({ deviceId: DEVICE });
    expect(res.body.available).toBe(true);
    expect(res.body.prices.map((price: { crop: string }) => price.crop)).toEqual(['chana']);
  });

  it('hides silently (available: false) when data.gov.in fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const failing: MandiProvider = { getPrices: async () => Promise.reject(new Error('down')) };
    const res = await request(await appWith(failing)).get('/api/mandi').query({ deviceId: DEVICE });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ available: false, prices: [] });
  });
});
