import { describe, expect, it } from 'vitest';
import { searchParams } from './market';

describe('searchParams', () => {
  it('sends only the filters that are set', () => {
    expect(searchParams({ sort: 'newest' }, 1).toString()).toBe('sort=newest&page=1');
  });

  it('sends all filters, prices in paise, location with radius', () => {
    const params = searchParams(
      {
        sort: 'price_asc',
        category: 'crop',
        product: 'bajra',
        q: '  साफ़  ',
        minPrice: 2000_00,
        maxPrice: 3000_00,
        minQty: 10,
        bulk: true,
        near: { lat: 28.3, lon: 74.95, label: 'चूरू', radiusKm: 50 },
      },
      2,
    );
    expect(Object.fromEntries(params)).toEqual({
      sort: 'price_asc',
      page: '2',
      category: 'crop',
      product: 'bajra',
      q: 'साफ़',
      minPrice: '200000',
      maxPrice: '300000',
      minQty: '10',
      bulk: 'true',
      lat: '28.3',
      lon: '74.95',
      radiusKm: '50',
    });
  });
});
