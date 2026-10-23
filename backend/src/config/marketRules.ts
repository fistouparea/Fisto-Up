/**
 * Marketplace business rules in one place. Change numbers here, not in services or controllers.
 * Money is always stored as integer paise (₹1 = 100 paise).
 */

export const AUTH_RULES = {
  pinLength: 4,
  /** bcrypt cost. 10 keeps login under ~100 ms on a small server; 4-digit PINs are protected by the lockout. */
  bcryptCost: 10,
  /** Wrong PINs in a row before the account is locked. */
  maxFailedLogins: 5,
  lockMinutes: 15,
  sessionDays: 30,
  cookieName: 'agriai_session',
  /** Per IP. Generous because many village phones share one mobile-network IP; the per-account lockout is strict. */
  loginRateLimit: { windowMs: 15 * 60_000, limit: 30 },
  registerRateLimit: { windowMs: 60 * 60_000, limit: 20 },
  /** Too easy to guess, refused at registration. */
  weakPins: ['1234', '4321', '0123', '1212', '6969'],
} as const;

export const COMMISSION_RULES = {
  /** Our commission on every completed order, collected offline by coordinators. Override with COMMISSION_PERCENT. */
  defaultPercent: 3,
  minPercent: 2,
  maxPercent: 5,
} as const;

/** Commission in paise for an order total, rounded half up. `rateBps`: 300 = 3%. */
export function commissionPaise(totalPaise: number, rateBps: number): number {
  return Math.floor((totalPaise * rateBps + 5_000) / 10_000);
}

export function percentToBps(percent: number): number {
  return Math.round(percent * 100);
}

export const LISTING_RULES = {
  maxPhotos: 3,
  /** Unused uploaded photos (e.g. after "दूसरी फोटो लें") are deleted after this many hours. */
  unattachedPhotoHours: 24,
  maxQuantity: 100_000,
  /** ₹10 lakh per unit is far above any real price; catches a slip like an extra zero zero zero. */
  maxPricePerUnitPaise: 10_00_000_00,
  maxSpokenTextLength: 500,
  pageSize: 20,
  /** Search radius choices for "पास में" (km). */
  maxRadiusKm: 300,
} as const;

export const PRICING_RULES = {
  /** Suggested fair range for crops: around the median mandi modal price. */
  mandiBandBelow: 0.05,
  mandiBandAbove: 0.05,
  /** SHG products: need this many similar active listings before showing a platform median. */
  minSimilarListings: 3,
  /** Range shown around the platform median for SHG products. */
  platformBand: 0.15,
  /** 1 quintal = 100 kg (mandi prices are per quintal). */
  kgPerQuintal: 100,
} as const;

export const ORDER_RULES = {
  maxNoteLength: 300,
  maxAddressLength: 300,
  /** A price request may not go below this share of the listed price (stops ₹1 offers). */
  minOfferShare: 0.5,
  ratingCommentMax: 300,
} as const;

export const NOTIFICATION_RULES = {
  /** In-app list length. */
  listLimit: 50,
  /** How often the app checks for new marketplace notifications. Mirrored in the frontend. */
  pollSeconds: 30,
} as const;
