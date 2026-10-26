/** Rules for "साथ में मंडी चलें" (shared vehicle) and delivery tracking links. Edit numbers here. */
export const MANDI_POOL_RULES = {
  /** Trips can be planned up to this many days ahead. */
  maxDaysAhead: 30,
  maxCapacityQuintal: 500,
  maxMembers: 40,
  maxQuantityPerMember: 200,
} as const;

/** Delivery steps a delivery person can report, in order (they never change the order's own status). */
export const DELIVERY_STEPS = ['picked', 'on_the_way', 'delivered'] as const;
export type DeliveryStep = (typeof DELIVERY_STEPS)[number];

export const DELIVERY_RULES = {
  /** A delivery link works for this many days. */
  linkDays: 14,
  /** Per IP, for the public link (no login). */
  rateLimit: { windowMs: 15 * 60_000, limit: 30 },
} as const;
