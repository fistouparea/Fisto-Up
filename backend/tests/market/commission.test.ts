import { describe, expect, it } from 'vitest';
import { commissionPaise, percentToBps } from '../../src/config/marketRules.js';
import { indiaMonth } from '../../src/modules/commission/commission.service.js';
import { upiPayLink } from '../../src/modules/orders/upi.js';

describe('commission calculation (integer paise)', () => {
  it.each([
    [25_000_00, 300, 750_00], // ₹25,000 at 3% = ₹750
    [1_00, 300, 3], // ₹1 at 3% = 3 paise
    [50, 300, 2], // 1.5 paise rounds half up to 2
    [49, 300, 1], // 1.47 → 1
    [12_345_67, 250, 30_864], // 30863.75 → 30864
    [0, 500, 0],
  ])('%i paise at %i bps = %i paise', (total, bps, expected) => {
    expect(commissionPaise(total, bps)).toBe(expected);
    expect(Number.isInteger(commissionPaise(total, bps))).toBe(true);
  });

  it('converts percent to basis points', () => {
    expect(percentToBps(3)).toBe(300);
    expect(percentToBps(2.5)).toBe(250);
  });

  it('books by India month (late evening UTC is already the next day in India)', () => {
    expect(indiaMonth(new Date('2026-11-30T19:00:00Z'))).toBe('2026-12');
    expect(indiaMonth(new Date('2026-11-30T17:00:00Z'))).toBe('2026-11');
  });
});

describe('UPI payment link', () => {
  it('fills seller UPI ID, name, amount in rupees and the order reference', () => {
    expect(upiPayLink({ upiId: 'sunita@okaxis', payeeName: 'सुनीता देवी', amountPaise: 25_000_50, orderRef: 'AG7K3P9Q' })).toBe(
      'upi://pay?pa=sunita%40okaxis&pn=%E0%A4%B8%E0%A5%81%E0%A4%A8%E0%A5%80%E0%A4%A4%E0%A4%BE%20%E0%A4%A6%E0%A5%87%E0%A4%B5%E0%A5%80&am=25000.50&cu=INR&tn=AgriAI%20order%20AG7K3P9Q&tr=AG7K3P9Q',
    );
  });
});
