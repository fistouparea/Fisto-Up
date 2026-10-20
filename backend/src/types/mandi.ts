import type { CropId } from './diagnosis.js';

export interface MandiPrice {
  crop: CropId;
  /** Hindi mandi name. */
  market: string;
  /** Rupees per quintal. */
  modalPrice: number;
  minPrice: number;
  maxPrice: number;
  /** Date of the price data ("YYYY-MM-DD"). */
  date: string;
}

export interface MandiResponse {
  /** false: no API key or the service failed; the app hides the card. */
  available: boolean;
  prices: MandiPrice[];
}
