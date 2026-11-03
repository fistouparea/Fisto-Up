import { describe, expect, it } from 'vitest';
import { parseRoute, routes } from '../hooks/useHashRoute';
import { slaHoursLeft } from './complaints';

describe('complaints', () => {
  it('counts hours left until the SLA time (negative when overdue)', () => {
    const now = Date.parse('2026-11-10T06:00:00Z');
    expect(slaHoursLeft({ slaDueAt: '2026-11-12T06:00:00Z' }, now)).toBe(48);
    expect(slaHoursLeft({ slaDueAt: '2026-11-10T04:30:00Z' }, now)).toBe(-2);
    expect(slaHoursLeft({}, now)).toBeNull();
  });

  it('routes to the list and to one complaint', () => {
    expect(parseRoute(routes.complaints)).toEqual({ name: 'complaints' });
    expect(parseRoute(routes.complaint('c1'))).toEqual({ name: 'complaint', id: 'c1' });
  });
});
