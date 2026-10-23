/**
 * The order state machine: every allowed step, who may take it and what happens with it, in ONE place.
 *
 *   requested ─▶ accepted ─▶ ready ─▶ out_for_delivery ─┐
 *       │           │          │   └▶ ready_for_pickup ─┴▶ delivered ─▶ paid ─▶ completed
 *       ├▶ rejected  └▶ cancelled └▶ cancelled
 *       └▶ cancelled
 */
export const ORDER_STATUSES = [
  'requested',
  'accepted',
  'rejected',
  'ready',
  'out_for_delivery',
  'ready_for_pickup',
  'delivered',
  'paid',
  'completed',
  'cancelled',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const FULFILMENTS = ['delivery', 'pickup'] as const;
export type Fulfilment = (typeof FULFILMENTS)[number];

export type OrderActor = 'buyer' | 'seller' | 'coordinator';

/**
 * reserveStock: take the quantity out of the listing (atomic, fails if not enough is left).
 * releaseStock: put a reserved quantity back.
 * recordCommission: add the commission entry to the ledger.
 */
export type OrderEffect = 'reserveStock' | 'releaseStock' | 'recordCommission';

export interface TransitionRule {
  from: OrderStatus;
  to: OrderStatus;
  /** Coordinators can take every seller step for sellers who cannot use the app. */
  by: readonly OrderActor[];
  /** Step exists only for this way of getting the goods. */
  only?: Fulfilment;
  effect?: OrderEffect;
}

const SELLER_SIDE = ['seller', 'coordinator'] as const;
const EVERYONE = ['buyer', 'seller', 'coordinator'] as const;

export const ORDER_TRANSITIONS: readonly TransitionRule[] = [
  { from: 'requested', to: 'accepted', by: SELLER_SIDE, effect: 'reserveStock' },
  { from: 'requested', to: 'rejected', by: SELLER_SIDE },
  { from: 'requested', to: 'cancelled', by: ['buyer', 'coordinator'] },
  { from: 'accepted', to: 'ready', by: SELLER_SIDE },
  { from: 'accepted', to: 'cancelled', by: EVERYONE, effect: 'releaseStock' },
  { from: 'ready', to: 'out_for_delivery', by: SELLER_SIDE, only: 'delivery' },
  { from: 'ready', to: 'ready_for_pickup', by: SELLER_SIDE, only: 'pickup' },
  { from: 'ready', to: 'cancelled', by: SELLER_SIDE, effect: 'releaseStock' },
  { from: 'out_for_delivery', to: 'delivered', by: EVERYONE },
  { from: 'ready_for_pickup', to: 'delivered', by: EVERYONE },
  /** "पैसे मिल गए": only the one who received the money (or the coordinator) confirms it. */
  { from: 'delivered', to: 'paid', by: SELLER_SIDE },
  /** The buyer closes the order (then rates); a coordinator can close it when the buyer does not. */
  { from: 'paid', to: 'completed', by: ['buyer', 'coordinator'], effect: 'recordCommission' },
];

export const TERMINAL_STATUSES: readonly OrderStatus[] = ['rejected', 'completed', 'cancelled'];

/** Stock is held for the order in these states (taken on accept, given back on cancel). */
export const STOCK_HELD_STATUSES: readonly OrderStatus[] = ['accepted', 'ready', 'out_for_delivery', 'ready_for_pickup', 'delivered', 'paid', 'completed'];

/** Phone numbers are shared between buyer and seller only once the seller has accepted. */
export const CONTACT_VISIBLE_STATUSES: readonly OrderStatus[] = STOCK_HELD_STATUSES;

/** The buyer sees the UPI payment details from acceptance until the seller confirms the money. */
export const PAYMENT_VISIBLE_STATUSES: readonly OrderStatus[] = ['accepted', 'ready', 'out_for_delivery', 'ready_for_pickup', 'delivered'];

export function findTransition(from: OrderStatus, to: OrderStatus, actor: OrderActor, fulfilment: Fulfilment): TransitionRule | null {
  return (
    ORDER_TRANSITIONS.find(
      (rule) => rule.from === from && rule.to === to && rule.by.includes(actor) && (!rule.only || rule.only === fulfilment),
    ) ?? null
  );
}

/** The buttons to show this person for an order in `from`. */
export function allowedNextStatuses(from: OrderStatus, actor: OrderActor, fulfilment: Fulfilment): OrderStatus[] {
  return ORDER_TRANSITIONS.filter(
    (rule) => rule.from === from && rule.by.includes(actor) && (!rule.only || rule.only === fulfilment),
  ).map((rule) => rule.to);
}
