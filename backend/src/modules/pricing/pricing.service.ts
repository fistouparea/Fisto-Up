import { productInfo, type ProductId, type Unit } from '../../config/marketCatalog.js';
import { PRICING_RULES } from '../../config/marketRules.js';
import type { AiProvider } from '../../services/ai/aiProvider.js';
import type { MandiProvider } from '../../services/mandi/agmarknetProvider.js';
import type { MandiPrice } from '../../types/mandi.js';
import { ListingModel, VISIBLE_LISTING_FILTER } from '../listings/listing.model.js';
import type { PriceSuggestion } from './pricing.types.js';
import { logger } from '../../observability/logger.js';

export interface PricingDeps {
  mandi: MandiProvider | null;
  ai: AiProvider;
}

const AI_CACHE_MS = 24 * 60 * 60 * 1000;
const aiCache = new Map<string, { value: PriceSuggestion; expiresAt: number }>();

/**
 * Fair price suggestion for the listing form. Crops: mandi prices, else similar listings on our platform.
 * SHG products: similar listings, else an AI estimate. Any failure just means "no suggestion": never blocks listing.
 */
export async function suggestPrice(product: ProductId, unit: Unit, deps: PricingDeps): Promise<PriceSuggestion> {
  const info = productInfo(product);
  const sources =
    info.category === 'crop'
      ? [() => fromMandi(product, unit, deps.mandi), () => fromPlatform(product, unit)]
      : [() => fromPlatform(product, unit), () => fromAi(product, unit, deps.ai)];

  for (const source of sources) {
    try {
      const suggestion = await source();
      if (suggestion.source !== null) return suggestion;
    } catch (error) {
      logger.warn({ err: error }, 'price suggestion source failed');
    }
  }
  return { source: null };
}

async function fromMandi(product: ProductId, unit: Unit, mandi: MandiProvider | null): Promise<PriceSuggestion> {
  const crop = productInfo(product).mandiCrop;
  if (!mandi || !crop) return { source: null };

  const all = await mandi.getPrices([crop]);
  const latestDate = all.reduce((latest, price) => (price.date > latest ? price.date : latest), '');
  const latest = all.filter((price) => price.date === latestDate && price.modalPrice > 0);
  if (latest.length === 0) return { source: null };

  const medianModalRupees = median(latest.map((price) => price.modalPrice));
  const perUnit = (rupeesPerQuintal: number) => toUnitPaise(rupeesPerQuintal, unit);
  return {
    source: 'mandi',
    unit,
    mandiMinPaisePerQuintal: Math.round(Math.min(...latest.map(validMin)) * 100),
    mandiMaxPaisePerQuintal: Math.round(Math.max(...latest.map((price) => price.maxPrice || price.modalPrice)) * 100),
    date: latestDate,
    markets: [...new Set(latest.map((price) => price.market))],
    fairMinPaise: perUnit(medianModalRupees * (1 - PRICING_RULES.mandiBandBelow)),
    fairMaxPaise: perUnit(medianModalRupees * (1 + PRICING_RULES.mandiBandAbove)),
  };
}

/** Mandi quotes are per quintal; a kg price is 1/100 of that. Other units have no mandi price. */
function toUnitPaise(rupeesPerQuintal: number, unit: Unit): number {
  const rupees = unit === 'kg' ? rupeesPerQuintal / PRICING_RULES.kgPerQuintal : rupeesPerQuintal;
  return Math.round(rupees * 100);
}

function validMin(price: MandiPrice): number {
  return price.minPrice > 0 ? price.minPrice : price.modalPrice;
}

/** Median price of similar listings that buyers can see right now. */
async function fromPlatform(product: ProductId, unit: Unit): Promise<PriceSuggestion> {
  const rows = await ListingModel.find(
    { product, unit, ...VISIBLE_LISTING_FILTER },
    { pricePerUnitPaise: 1 },
  )
    .sort({ createdAt: -1 })
    .limit(200)
    .lean()
    .exec();
  if (rows.length < PRICING_RULES.minSimilarListings) return { source: null };

  const middle = median(rows.map((row) => row.pricePerUnitPaise));
  return {
    source: 'platform',
    unit,
    sampleSize: rows.length,
    fairMinPaise: Math.round(middle * (1 - PRICING_RULES.platformBand)),
    fairMaxPaise: Math.round(middle * (1 + PRICING_RULES.platformBand)),
  };
}

/** Only the product name and unit go to the AI. Low-confidence or odd answers are dropped. Cached for a day. */
async function fromAi(product: ProductId, unit: Unit, ai: AiProvider): Promise<PriceSuggestion> {
  const key = `${product}:${unit}`;
  const cached = aiCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const info = productInfo(product);
  const estimate = await ai.estimatePrice({ productName: `${info.hi} (${info.en})`, unit });
  const usable =
    estimate.confidence !== 'low' &&
    estimate.min_rupees > 0 &&
    estimate.max_rupees >= estimate.min_rupees &&
    estimate.max_rupees <= estimate.min_rupees * 5;

  const value: PriceSuggestion = usable
    ? {
        source: 'ai',
        unit,
        fairMinPaise: Math.round(estimate.min_rupees * 100),
        fairMaxPaise: Math.round(estimate.max_rupees * 100),
      }
    : { source: null };
  aiCache.set(key, { value, expiresAt: Date.now() + AI_CACHE_MS });
  return value;
}

/** For tests. */
export function clearPriceCache(): void {
  aiCache.clear();
}

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? (sorted[middle] ?? 0) : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}
