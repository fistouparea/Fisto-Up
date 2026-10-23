import { describe, expect, it } from 'vitest';
import {
  allowedNextStatuses,
  findTransition,
  ORDER_STATUSES,
  ORDER_TRANSITIONS,
  TERMINAL_STATUSES,
  type OrderActor,
} from '../../src/modules/orders/orderStateMachine.js';

const ACTORS: OrderActor[] = ['buyer', 'seller', 'coordinator'];

describe('order state machine', () => {
  it.each([
    ['requested', 'accepted', 'seller', 'reserveStock'],
    ['requested', 'rejected', 'seller', undefined],
    ['requested', 'cancelled', 'buyer', undefined],
    ['accepted', 'ready', 'seller', undefined],
    ['accepted', 'cancelled', 'buyer', 'releaseStock'],
    ['accepted', 'cancelled', 'seller', 'releaseStock'],
    ['ready', 'cancelled', 'seller', 'releaseStock'],
    ['out_for_delivery', 'delivered', 'buyer', undefined],
    ['ready_for_pickup', 'delivered', 'seller', undefined],
    ['delivered', 'paid', 'seller', undefined],
    ['paid', 'completed', 'buyer', 'recordCommission'],
  ] as const)('allows %s → %s by the %s (effect: %s)', (from, to, actor, effect) => {
    const rule = findTransition(from, to, actor, 'delivery') ?? findTransition(from, to, actor, 'pickup');
    expect(rule).not.toBeNull();
    expect(rule?.effect).toBe(effect);
  });

  it.each([
    ['requested', 'accepted', 'buyer'],
    ['requested', 'completed', 'seller'],
    ['ready', 'cancelled', 'buyer'],
    ['delivered', 'paid', 'buyer'],
    ['paid', 'completed', 'seller'],
    ['requested', 'paid', 'coordinator'],
    ['accepted', 'delivered', 'seller'],
  ] as const)('refuses %s → %s by the %s', (from, to, actor) => {
    expect(findTransition(from, to, actor, 'delivery')).toBeNull();
    expect(findTransition(from, to, actor, 'pickup')).toBeNull();
  });

  it('delivery orders go out for delivery, pickup orders become ready for pickup', () => {
    expect(allowedNextStatuses('ready', 'seller', 'delivery')).toEqual(['out_for_delivery', 'cancelled']);
    expect(allowedNextStatuses('ready', 'seller', 'pickup')).toEqual(['ready_for_pickup', 'cancelled']);
    expect(findTransition('ready', 'ready_for_pickup', 'seller', 'delivery')).toBeNull();
  });

  it('a coordinator can take every seller step (for sellers who cannot use the app)', () => {
    for (const rule of ORDER_TRANSITIONS.filter((candidate) => candidate.by.includes('seller'))) {
      expect(rule.by).toContain('coordinator');
    }
  });

  it('finished orders cannot move any more', () => {
    for (const status of TERMINAL_STATUSES) {
      for (const actor of ACTORS) {
        expect(allowedNextStatuses(status, actor, 'delivery')).toEqual([]);
        expect(allowedNextStatuses(status, actor, 'pickup')).toEqual([]);
      }
    }
  });

  it('every non-final status has a way forward and every status is reachable', () => {
    const reachable = new Set(['requested', ...ORDER_TRANSITIONS.map((rule) => rule.to)]);
    for (const status of ORDER_STATUSES) {
      expect(reachable.has(status)).toBe(true);
      if (!TERMINAL_STATUSES.includes(status)) {
        expect(ORDER_TRANSITIONS.some((rule) => rule.from === status)).toBe(true);
      }
    }
  });

  it('stock is taken exactly once (on accept) and only given back from states that hold it', () => {
    expect(ORDER_TRANSITIONS.filter((rule) => rule.effect === 'reserveStock').map((rule) => rule.from)).toEqual(['requested']);
    for (const rule of ORDER_TRANSITIONS.filter((candidate) => candidate.effect === 'releaseStock')) {
      expect(['accepted', 'ready']).toContain(rule.from);
    }
    expect(ORDER_TRANSITIONS.filter((rule) => rule.effect === 'recordCommission')).toHaveLength(1);
  });
});
