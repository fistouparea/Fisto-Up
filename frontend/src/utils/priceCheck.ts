/** How far from the suggested range a price may be before the seller sees a gentle warning. */
const TOO_LOW_SHARE = 0.8;
const TOO_HIGH_SHARE = 1.3;

export type PriceCheck = 'ok' | 'tooLow' | 'tooHigh';

/** Never blocks: the seller sets the price. Only warns about a likely slip (e.g. a missing zero). */
export function checkPrice(pricePaise: number | null, fairMinPaise: number, fairMaxPaise: number): PriceCheck {
  if (pricePaise === null) return 'ok';
  if (pricePaise < fairMinPaise * TOO_LOW_SHARE) return 'tooLow';
  if (pricePaise > fairMaxPaise * TOO_HIGH_SHARE) return 'tooHigh';
  return 'ok';
}

/** A round number in the middle of the range, in paise (to the nearest rupee, or ₹10 above ₹1,000). */
export function suggestedPricePaise(fairMinPaise: number, fairMaxPaise: number): number {
  const middle = (fairMinPaise + fairMaxPaise) / 2;
  const step = middle >= 1000_00 ? 10_00 : 1_00;
  return Math.max(step, Math.round(middle / step) * step);
}
