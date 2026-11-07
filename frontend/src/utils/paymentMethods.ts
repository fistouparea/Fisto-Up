import type { PaymentMethod, PublicListing } from '../api/marketTypes';

/** Mirrors upiIdSchema in backend/src/modules/sellers/seller.types.ts, e.g. "9876543210@ybl". */
export const UPI_PATTERN = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9]{1,63}$/;

/**
 * How the buyer may pay this seller. Mirrors paymentMethodsFor in backend/src/modules/orders/paymentOptions.ts
 * (the server checks it again): UPI when the seller has a UPI ID, cash at delivery while cash payment is on.
 */
export function paymentMethodsFor(listing: Pick<PublicListing, 'seller'>, cashPayment: boolean): PaymentMethod[] {
  return [...(listing.seller.cashOnly ? [] : (['upi'] as const)), ...(cashPayment ? (['cash'] as const) : [])];
}
