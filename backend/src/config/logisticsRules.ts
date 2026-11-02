/** Rules for "साथ में मंडी चलें" (shared vehicle) and delivery tracking links. Edit numbers here. */
export const MANDI_POOL_RULES = {
  /** Trips can be planned up to this many days ahead. */
  maxDaysAhead: 30,
  maxCapacityQuintal: 500,
  maxMembers: 40,
  maxQuantityPerMember: 200,
} as const;

/**
 * Mandi trip states and who moves them (coordinators only). open: farmers can join. closed: full / no more joins.
 * departed: the vehicle left. completed: back. cancelled: not going (members are told).
 */
export const TRIP_STATUSES = ['open', 'closed', 'departed', 'completed', 'cancelled'] as const;
export type TripStatus = (typeof TRIP_STATUSES)[number];
export const TRIP_TRANSITIONS: Record<TripStatus, readonly TripStatus[]> = {
  open: ['closed', 'departed', 'cancelled'],
  closed: ['open', 'departed', 'cancelled'],
  departed: ['completed'],
  completed: [],
  cancelled: [],
};

/** Hindi texts for the members' notifications. */
export const TRIP_MESSAGES: Record<'changed' | Exclude<TripStatus, 'open'> | 'reopened', string> = {
  changed: 'मंडी गाड़ी की जानकारी बदली है। नई तारीख/जगह देखें।',
  reopened: 'मंडी गाड़ी में फिर से जगह है।',
  closed: 'मंडी गाड़ी भर गई है, अब नया माल नहीं जुड़ेगा।',
  departed: 'मंडी गाड़ी निकल गई है।',
  completed: 'मंडी गाड़ी का सफ़र पूरा हुआ।',
  cancelled: 'मंडी गाड़ी रद्द हो गई है। अपना माल दूसरे तरीके से भेजें।',
};

/** Delivery steps a delivery person can report, in order (they never change the order's own status). */
export const DELIVERY_STEPS = ['picked', 'on_the_way', 'delivered'] as const;
export type DeliveryStep = (typeof DELIVERY_STEPS)[number];

export const DELIVERY_RULES = {
  /** A delivery link works for this many days. */
  linkDays: 14,
  /** Per IP, for the public link (no login). */
  rateLimit: { windowMs: 15 * 60_000, limit: 30 },
} as const;
