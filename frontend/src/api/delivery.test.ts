import { describe, expect, it } from 'vitest';
import { parseRoute } from '../hooks/useHashRoute';
import { deliveryLinkUrl } from './delivery';

describe('delivery link', () => {
  it('builds the app link and opens the delivery page from it', () => {
    const url = deliveryLinkUrl('Abc_123-xyzABC_123-xyzABC_123-xy', 'https://app.example.in/');
    expect(url).toBe('https://app.example.in/#/delivery/Abc_123-xyzABC_123-xyzABC_123-xy');
    expect(parseRoute(url.slice(url.indexOf('#')))).toEqual({ name: 'delivery', token: 'Abc_123-xyzABC_123-xyzABC_123-xy' });
  });
});
