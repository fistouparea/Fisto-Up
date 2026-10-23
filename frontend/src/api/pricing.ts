import { getJson, isRecord } from './client';
import type { PriceSuggestion, ProductId, Unit } from './marketTypes';

export function fetchPriceSuggestion(product: ProductId, unit: Unit): Promise<PriceSuggestion> {
  const query = new URLSearchParams({ product, unit });
  return getJson(`/api/market/pricing/suggest?${query}`, isPriceSuggestion);
}

function isPriceSuggestion(body: unknown): body is PriceSuggestion {
  if (!isRecord(body)) return false;
  if (body.source === null) return true;
  return (
    (body.source === 'mandi' || body.source === 'platform' || body.source === 'ai') &&
    typeof body.fairMinPaise === 'number' &&
    typeof body.fairMaxPaise === 'number'
  );
}
