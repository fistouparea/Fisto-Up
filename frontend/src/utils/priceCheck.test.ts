import { describe, expect, it } from 'vitest';
import { checkPrice, suggestedPricePaise } from './priceCheck';

describe('price check', () => {
  it('warns about a price far below or above the suggestion, never in between', () => {
    expect(checkPrice(250_00, 2375_00, 2625_00)).toBe('tooLow'); // a missing zero
    expect(checkPrice(2400_00, 2375_00, 2625_00)).toBe('ok');
    expect(checkPrice(4000_00, 2375_00, 2625_00)).toBe('tooHigh');
    expect(checkPrice(null, 2375_00, 2625_00)).toBe('ok');
  });

  it('suggests a round middle price', () => {
    expect(suggestedPricePaise(2375_00, 2625_00)).toBe(2500_00);
    expect(suggestedPricePaise(23_75, 26_25)).toBe(25_00);
    expect(suggestedPricePaise(127_50, 172_50)).toBe(150_00);
  });
});
