/**
 * The booking state machine for every service kind (machines, workers, animals), in ONE place, like the
 * order state machine (modules/orders/orderStateMachine.ts).
 *
 *   requested ─▶ accepted ─▶ completed
 *       │           └▶ cancelled
 *       ├▶ rejected
 *       └▶ cancelled
 *
 * The requester asked (their "yes"); the owner accepting is the second "yes": only then are phone numbers shared.
 */
export const BOOKING_STATUSES = ['requested', 'accepted', 'rejected', 'cancelled', 'completed'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export type BookingActor = 'owner' | 'requester' | 'coordinator';

/** lockDates: take the booked dates in the calendar (atomic, fails if taken). releaseDates: give them back. */
export type BookingEffect = 'lockDates' | 'releaseDates';

export interface BookingRule {
  from: BookingStatus;
  to: BookingStatus;
  /** Coordinators can take every owner step for people who cannot use the app. */
  by: readonly BookingActor[];
  effect?: BookingEffect;
}

const OWNER_SIDE = ['owner', 'coordinator'] as const;
const EVERYONE = ['owner', 'requester', 'coordinator'] as const;

export const BOOKING_TRANSITIONS: readonly BookingRule[] = [
  { from: 'requested', to: 'accepted', by: OWNER_SIDE, effect: 'lockDates' },
  { from: 'requested', to: 'rejected', by: OWNER_SIDE },
  { from: 'requested', to: 'cancelled', by: ['requester', 'coordinator'] },
  { from: 'accepted', to: 'completed', by: EVERYONE },
  { from: 'accepted', to: 'cancelled', by: EVERYONE, effect: 'releaseDates' },
];

/** Both sides said yes: phone numbers are visible. */
export const BOOKING_CONTACT_STATUSES: readonly BookingStatus[] = ['accepted', 'completed'];

export function findBookingRule(from: BookingStatus, to: BookingStatus, actor: BookingActor): BookingRule | null {
  return BOOKING_TRANSITIONS.find((rule) => rule.from === from && rule.to === to && rule.by.includes(actor)) ?? null;
}

export function allowedBookingSteps(from: BookingStatus, actor: BookingActor): BookingStatus[] {
  return BOOKING_TRANSITIONS.filter((rule) => rule.from === from && rule.by.includes(actor)).map((rule) => rule.to);
}
