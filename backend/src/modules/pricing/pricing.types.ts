import { z } from 'zod';
import { PRODUCT_IDS, UNITS, type Unit } from '../../config/marketCatalog.js';

export const suggestQuerySchema = z.object({ product: z.enum(PRODUCT_IDS), unit: z.enum(UNITS) });

/** What the AI must return for an SHG price estimate. */
export const aiPriceEstimateSchema = z.object({
  min_rupees: z.number().min(0).max(1_000_000),
  max_rupees: z.number().min(0).max(1_000_000),
  confidence: z.enum(['high', 'medium', 'low']),
});
export type AiPriceEstimate = z.infer<typeof aiPriceEstimateSchema>;

interface FairRange {
  unit: Unit;
  /** Suggested fair range per `unit`, integer paise. A suggestion only: the seller sets the price. */
  fairMinPaise: number;
  fairMaxPaise: number;
}

export type PriceSuggestion =
  | (FairRange & {
      source: 'mandi';
      /** Today's (latest) mandi range, always per quintal as mandis quote it. */
      mandiMinPaisePerQuintal: number;
      mandiMaxPaisePerQuintal: number;
      /** Date of the mandi data, "YYYY-MM-DD". */
      date: string;
      markets: string[];
    })
  | (FairRange & { source: 'platform'; sampleSize: number })
  | (FairRange & { source: 'ai' })
  /** No reliable data: the app hides the suggestion. */
  | { source: null };
