import { describe, expect, it } from 'vitest';
import { parseRoute, routes } from './useHashRoute';

describe('service routes', () => {
  it('round-trips every service screen', () => {
    expect(parseRoute(routes.services('equipment'))).toEqual({ name: 'services', kind: 'equipment', side: 'offer' });
    expect(parseRoute(routes.services('labour', 'need'))).toEqual({ name: 'services', kind: 'labour', side: 'need' });
    expect(parseRoute(routes.serviceItem('abc'))).toEqual({ name: 'serviceItem', id: 'abc' });
    expect(parseRoute(routes.serviceBooking('b1'))).toEqual({ name: 'serviceBooking', id: 'b1' });
    expect(parseRoute(routes.servicesMine)).toEqual({ name: 'servicesMine' });
    expect(parseRoute(routes.serviceNew('livestock'))).toEqual({ name: 'serviceNew', kind: 'livestock', side: 'offer' });
    expect(parseRoute(routes.schemes)).toEqual({ name: 'schemes' });
    expect(parseRoute(routes.settings)).toEqual({ name: 'settings' });
  });

  it('unknown kinds go home', () => {
    expect(parseRoute('#/services/rockets')).toEqual({ name: 'home' });
  });
});
