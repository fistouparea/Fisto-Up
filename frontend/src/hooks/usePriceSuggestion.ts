import { useEffect, useState } from 'react';
import type { PriceSuggestion, ProductId, Unit } from '../api/marketTypes';
import { fetchPriceSuggestion } from '../api/pricing';

/** Suggestion for this product + unit; null while loading or when there is none (never an error on screen). */
export function usePriceSuggestion(product: ProductId | null, unit: Unit | null): PriceSuggestion | null {
  const [result, setResult] = useState<{ key: string; suggestion: PriceSuggestion } | null>(null);
  const key = product && unit ? `${product}:${unit}` : null;

  useEffect(() => {
    if (!product || !unit) return;
    let cancelled = false;
    fetchPriceSuggestion(product, unit)
      .then((suggestion) => !cancelled && setResult({ key: `${product}:${unit}`, suggestion }))
      .catch(() => !cancelled && setResult({ key: `${product}:${unit}`, suggestion: { source: null } }));
    return () => {
      cancelled = true;
    };
  }, [product, unit]);

  return result && result.key === key ? result.suggestion : null;
}
