import { describe, expect, it } from 'vitest';
import { EMPTY_TRIP_FORM, validateTripForm } from './tripForm';

const form = { ...EMPTY_TRIP_FORM, mandi: 'चूरू मंडी', date: '2026-11-10', tehsil: 'चूरू', pickupPoint: 'बस स्टैंड', vehicle: 'पिकअप', capacity: '20', cost: '40' };

describe('coordinator trip form', () => {
  it('turns the form into a trip (rupees → paise)', () => {
    expect(validateTripForm(form, 0, '2026-11-03').trip).toMatchObject({ capacityQuintal: 20, costPerQuintalPaise: 40_00 });
  });

  it('refuses past or far dates, missing fields and capacity below what is booked', () => {
    expect(validateTripForm({ ...form, date: '2026-11-01' }, 0, '2026-11-03').trip).toBeNull();
    expect(validateTripForm({ ...form, date: '2026-12-31' }, 0, '2026-11-03').trip).toBeNull();
    expect(validateTripForm({ ...form, vehicle: ' ' }, 0, '2026-11-03').trip).toBeNull();
    expect(validateTripForm(form, 25, '2026-11-03').trip).toBeNull();
    expect(validateTripForm({ ...form, cost: '' }, 0, '2026-11-03').trip?.costPerQuintalPaise).toBeUndefined();
  });
});
