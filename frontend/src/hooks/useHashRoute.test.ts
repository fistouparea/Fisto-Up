import { describe, expect, it } from 'vitest';
import { parseRoute, routes } from './useHashRoute';

describe('parseRoute', () => {
  it.each([
    ['', { name: 'home' }],
    ['#/', { name: 'home' }],
    ['#/unknown', { name: 'home' }],
    ['#/check', { name: 'diagnose' }],
    ['#/history', { name: 'history' }],
    ['#/history/abc123', { name: 'historyItem', id: 'abc123' }],
    ['#/farm', { name: 'farm' }],
    ['#/farm/setup', { name: 'farmSetup' }],
    ['#/weather', { name: 'weather' }],
    ['#/water', { name: 'water' }],
    ['#/calendar', { name: 'calendar' }],
    ['#/notifications', { name: 'notifications' }],
    ['#/login', { name: 'login' }],
    ['#/register', { name: 'register' }],
    ['#/account', { name: 'account' }],
    ['#/account/seller', { name: 'sellerProfile' }],
    ['#/account/buyer', { name: 'buyerProfile' }],
    ['#/sell', { name: 'sell' }],
    ['#/sell/new', { name: 'sellNew' }],
    ['#/market', { name: 'market' }],
    ['#/market/listing/abc', { name: 'listing', id: 'abc' }],
    ['#/orders', { name: 'orders' }],
    ['#/orders/o1', { name: 'order', id: 'o1' }],
    ['#/admin', { name: 'admin', tab: 'overview' }],
    ['#/admin/ledger', { name: 'admin', tab: 'ledger' }],
    ['#/admin/unknown', { name: 'admin', tab: 'overview' }],
  ])('parses "%s"', (hash, expected) => {
    expect(parseRoute(hash)).toEqual(expected);
  });

  it('round-trips history item links', () => {
    expect(parseRoute(routes.historyItem('a b/c'))).toEqual({ name: 'historyItem', id: 'a b/c' });
  });
});
