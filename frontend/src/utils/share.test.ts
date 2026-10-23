import { describe, expect, it } from 'vitest';
import { listingLink, whatsappShareUrl } from './share';

describe('share', () => {
  it('builds a wa.me link with the encoded text', () => {
    expect(whatsappShareUrl('बाजरा ₹2,500 https://x.in/#/a')).toBe(
      'https://wa.me/?text=%E0%A4%AC%E0%A4%BE%E0%A4%9C%E0%A4%B0%E0%A4%BE%20%E2%82%B92%2C500%20https%3A%2F%2Fx.in%2F%23%2Fa',
    );
  });

  it('links to the listing page', () => {
    expect(listingLink('https://agri.example', 'abc')).toBe('https://agri.example/#/market/listing/abc');
  });
});
