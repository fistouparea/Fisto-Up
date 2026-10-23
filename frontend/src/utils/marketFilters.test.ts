import { describe, expect, it } from 'vitest';
import { activeFilterCount } from './marketFilters';

describe('activeFilterCount', () => {
  it('counts panel filters, not category/product/search', () => {
    expect(activeFilterCount({ sort: 'newest', category: 'crop', product: 'bajra', q: 'x' })).toBe(0);
    expect(
      activeFilterCount({ sort: 'price_asc', minPrice: 1, bulk: true, near: { lat: 1, lon: 1, label: 'चूरू', radiusKm: 25 } }),
    ).toBe(4);
  });
});
