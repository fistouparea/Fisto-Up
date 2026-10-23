import type { SearchFilters } from '../api/marketTypes';

/** How many filters inside the filter panel are active (shown on the फ़िल्टर button). */
export function activeFilterCount(filters: SearchFilters): number {
  const active = [filters.minPrice, filters.maxPrice, filters.minQty, filters.bulk, filters.near];
  return active.filter((value) => value !== undefined).length + (filters.sort === 'newest' ? 0 : 1);
}
