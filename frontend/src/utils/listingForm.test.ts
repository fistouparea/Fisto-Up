import { describe, expect, it } from 'vitest';
import type { ListingDraft } from '../api/marketTypes';
import { changeProduct, formFromDraft, validateListingForm } from './listingForm';

const draft: ListingDraft = {
  category: 'crop',
  product: 'bajra',
  quantity: 10,
  unit: 'quintal',
  pricePerUnitPaise: 250_000,
  qualityNotes: 'साफ़',
  title: { hi: 'साफ़ बाजरा – 10 क्विंटल', en: 'Clean Bajra' },
  description: { hi: 'सूखा', en: 'Dry' },
};

describe('listing form', () => {
  it('fills from the AI draft and turns it into the listing to save', () => {
    const { errors, listing } = validateListingForm(formFromDraft(draft), ['p1']);
    expect(errors).toEqual({});
    expect(listing).toMatchObject({ product: 'bajra', unit: 'quintal', quantity: 10, pricePerUnitPaise: 250_000, photoIds: ['p1'] });
  });

  it('lists everything still missing when the AI could not help', () => {
    const { errors, listing } = validateListingForm(formFromDraft(null), []);
    expect(listing).toBeNull();
    expect(Object.keys(errors).sort()).toEqual(['price', 'product', 'quantity', 'title', 'unit']);
  });

  it('changing the product picks an allowed unit and a matching title', () => {
    const form = changeProduct(formFromDraft(draft), 'handicraft');
    expect(form).toMatchObject({ product: 'handicraft', unit: 'piece', titleHi: 'हस्तशिल्प', descriptionHi: '' });
  });

  it('keeps an FSSAI number only for food and checks its length', () => {
    const food = { ...changeProduct(formFromDraft(draft), 'achar'), unit: 'pack' as const, fssai: '12345678901234' };
    expect(validateListingForm(food, []).listing?.fssaiNumber).toBe('12345678901234');
    expect(validateListingForm({ ...food, fssai: '123' }, []).errors.fssai).toBeDefined();

    const craft = { ...changeProduct(formFromDraft(draft), 'handicraft'), fssai: '12345678901234' };
    expect(validateListingForm(craft, []).listing).not.toHaveProperty('fssaiNumber');
  });

  it('refuses a bulk minimum above the quantity', () => {
    expect(validateListingForm({ ...formFromDraft(draft), minOrderQty: 11 }, []).errors.minOrder).toBeDefined();
  });
});
