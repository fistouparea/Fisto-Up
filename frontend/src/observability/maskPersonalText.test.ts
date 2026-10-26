import { describe, expect, it } from 'vitest';
import { maskPersonalText } from './maskPersonalText';

describe('maskPersonalText', () => {
  it('masks Indian mobile numbers in any common spelling', () => {
    for (const phone of ['9876543210', '+91 9876543210', '+91-98765 43210', '09876543210']) {
      expect(maskPersonalText(`call ${phone} now`)).toBe('call [phone] now');
    }
  });

  it('keeps ordinary numbers such as prices, order refs and years', () => {
    expect(maskPersonalText('₹2500 for order AG7K2M9P in 2026, qty 1234567')).toBe('₹2500 for order AG7K2M9P in 2026, qty 1234567');
  });

  it('masks tokens and long base64 data', () => {
    expect(maskPersonalText('t=eyJhbGciOi.eyJzdWIiOi.c2lnbmF0dXJl')).toBe('t=[token]');
    expect(maskPersonalText(`img ${'A'.repeat(300)}`)).toBe('img [data]');
  });
});
