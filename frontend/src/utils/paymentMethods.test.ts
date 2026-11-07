import { describe, expect, it } from 'vitest';
import { DEFAULT_FLAGS } from '../api/flags';
import { paymentMethodsFor, UPI_PATTERN } from './paymentMethods';

const listing = (cashOnly?: boolean) => ({ seller: { id: 's1', name: 'कमला', village: 'छापर', verified: true, rating: { average: null, count: 0 }, ...(cashOnly !== undefined && { cashOnly }) } });

describe('how a buyer may pay (mirrors the server rule)', () => {
  it('seller with UPI: UPI and cash at delivery; only UPI while cash payment is off', () => {
    expect(paymentMethodsFor(listing(false), true)).toEqual(['upi', 'cash']);
    expect(paymentMethodsFor(listing(false), false)).toEqual(['upi']);
  });

  it('seller without UPI: cash at delivery only, never UPI', () => {
    expect(paymentMethodsFor(listing(true), true)).toEqual(['cash']);
    expect(paymentMethodsFor(listing(true), false)).toEqual([]);
  });

  it('an older server without the cashOnly field: the seller has UPI', () => {
    expect(paymentMethodsFor(listing(), true)).toEqual(['upi', 'cash']);
  });

  it('cash payment is on until the server says otherwise', () => {
    expect(DEFAULT_FLAGS.cashPayment).toBe(true);
  });

  it('checks the UPI ID format like the server', () => {
    expect(UPI_PATTERN.test('9876543210@ybl')).toBe(true);
    expect(UPI_PATTERN.test('kamla.devi@okaxis')).toBe(true);
    for (const wrong of ['9876543210', 'ramesh@', '@ybl', 'a b@ybl']) expect(UPI_PATTERN.test(wrong)).toBe(false);
  });
});
