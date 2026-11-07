import type { PaymentMethod } from './order.model.js';

/**
 * How a buyer may pay this seller. The one copy of the rule (the app shows the same on the order form):
 *   seller has a UPI ID → UPI link/QR, plus cash at delivery while cash payment is on
 *   no UPI ID           → cash at delivery only (and nothing while cash payment is off: the listing is hidden)
 */
export function paymentMethodsFor(sellerUpiId: string | null | undefined, cashOn: boolean): PaymentMethod[] {
  return [...(sellerUpiId ? (['upi'] as const) : []), ...(cashOn ? (['cash'] as const) : [])];
}
