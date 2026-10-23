import { describe, expect, it } from 'vitest';
import { formatRupees, paiseToRupeesInput, rupeesToPaise, totalPaise } from './money';

describe('money', () => {
  it('formats paise as Indian rupees', () => {
    expect(formatRupees(250_000)).toBe('₹2,500');
    expect(formatRupees(1_00_00_000)).toBe('₹1,00,000');
    expect(formatRupees(2_550)).toBe('₹25.5');
  });

  it.each([
    ['2500', 250_000],
    ['2,500', 250_000],
    ['₹ 25.50', 2_550],
    ['0.5', 50],
  ])('reads "%s" as %i paise', (input, paise) => {
    expect(rupeesToPaise(input)).toBe(paise);
  });

  it.each(['', '0', '-5', 'abc', '2.555', '1e3'])('rejects "%s"', (input) => {
    expect(rupeesToPaise(input)).toBeNull();
  });

  it('round-trips the input value', () => {
    expect(paiseToRupeesInput(250_000)).toBe('2500');
    expect(paiseToRupeesInput(null)).toBe('');
    expect(totalPaise(10, 250_000)).toBe(2_500_000);
  });
});
