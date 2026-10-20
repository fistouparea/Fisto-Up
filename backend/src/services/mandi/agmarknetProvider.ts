import { z } from 'zod';
import { MANDI_COMMODITIES, NEARBY_MANDIS } from '../../data/mandis.js';
import type { CropId } from '../../types/diagnosis.js';
import type { MandiPrice } from '../../types/mandi.js';

/** "Current daily price of various commodities from various markets (Mandi)" on data.gov.in. */
const API_URL = 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070';

const recordSchema = z.object({
  market: z.string(),
  commodity: z.string(),
  arrival_date: z.string(),
  min_price: z.union([z.string(), z.number()]),
  max_price: z.union([z.string(), z.number()]),
  modal_price: z.union([z.string(), z.number()]),
});
const responseSchema = z.object({ records: z.array(z.unknown()) });

export interface MandiProvider {
  /** Today's (latest) prices of these crops at nearby mandis. Throws if the service fails. */
  getPrices(crops: CropId[]): Promise<MandiPrice[]>;
}

export interface AgmarknetOptions {
  apiKey: string;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
  cacheTtlMs?: number;
  now?: () => Date;
}

/** data.gov.in Agmarknet prices for Rajasthan, filtered to nearby mandis. Cached for 3 hours. */
export class AgmarknetProvider implements MandiProvider {
  private cache: { prices: MandiPrice[]; expiresAt: number } | null = null;
  private readonly fetchFn: typeof fetch;
  private readonly timeoutMs: number;
  private readonly cacheTtlMs: number;
  private readonly now: () => Date;

  constructor(private readonly options: AgmarknetOptions) {
    this.fetchFn = options.fetchFn ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 10_000;
    this.cacheTtlMs = options.cacheTtlMs ?? 3 * 60 * 60 * 1000;
    this.now = options.now ?? (() => new Date());
  }

  async getPrices(crops: CropId[]): Promise<MandiPrice[]> {
    const all = await this.allNearbyPrices();
    return all.filter((price) => crops.includes(price.crop));
  }

  private async allNearbyPrices(): Promise<MandiPrice[]> {
    if (this.cache && this.cache.expiresAt > this.now().getTime()) return this.cache.prices;

    const params = new URLSearchParams({
      'api-key': this.options.apiKey,
      format: 'json',
      limit: '1000',
      'filters[state.keyword]': 'Rajasthan',
    });
    const response = await this.fetchFn(`${API_URL}?${params}`, { signal: AbortSignal.timeout(this.timeoutMs) });
    if (!response.ok) throw new Error(`Agmarknet HTTP ${response.status}`);

    const { records } = responseSchema.parse(await response.json());
    const prices = records.flatMap((record) => {
      const parsed = recordSchema.safeParse(record);
      return parsed.success ? toPrice(parsed.data) : [];
    });
    this.cache = { prices, expiresAt: this.now().getTime() + this.cacheTtlMs };
    return prices;
  }
}

function toPrice(record: z.infer<typeof recordSchema>): MandiPrice[] {
  const market = NEARBY_MANDIS.find((mandi) => mandi.match.test(record.market.trim()));
  const crop = (Object.entries(MANDI_COMMODITIES) as [CropId, RegExp][]).find(([, pattern]) => pattern.test(record.commodity))?.[0];
  const date = toIsoDate(record.arrival_date);
  const modalPrice = Number(record.modal_price);
  if (!market || !crop || !date || !Number.isFinite(modalPrice) || modalPrice <= 0) return [];
  return [{ crop, market: market.name, modalPrice, minPrice: Number(record.min_price), maxPrice: Number(record.max_price), date }];
}

/** Agmarknet dates look like "20/10/2026". */
function toIsoDate(value: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
}
