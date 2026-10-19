import { describe, expect, it } from 'vitest';
import { parseRoute, routes } from './useHashRoute';

describe('parseRoute', () => {
  it.each([
    ['', { name: 'diagnose' }],
    ['#/', { name: 'diagnose' }],
    ['#/unknown', { name: 'diagnose' }],
    ['#/history', { name: 'history' }],
    ['#/history/abc123', { name: 'historyItem', id: 'abc123' }],
    ['#/farm', { name: 'farm' }],
    ['#/farm/setup', { name: 'farmSetup' }],
    ['#/weather', { name: 'weather' }],
    ['#/water', { name: 'water' }],
  ])('parses "%s"', (hash, expected) => {
    expect(parseRoute(hash)).toEqual(expected);
  });

  it('round-trips history item links', () => {
    expect(parseRoute(routes.historyItem('a b/c'))).toEqual({ name: 'historyItem', id: 'a b/c' });
  });
});
