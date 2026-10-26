import { describe, expect, it } from 'vitest';
import { KIND_FIELDS } from './index';

describe('kind field checks', () => {
  it('a worker must confirm 18+, a work need does not', () => {
    const value = { typeId: 'katai', skills: ['katai'], details: {} };
    expect(KIND_FIELDS.labour.check('offer', value)).not.toBeNull();
    expect(KIND_FIELDS.labour.check('offer', { ...value, details: { ageConfirmed18: true } })).toBeNull();
    expect(KIND_FIELDS.labour.check('need', value)).toBeNull();
    expect(KIND_FIELDS.labour.check('need', { ...value, skills: [] })).not.toBeNull();
  });

  it('machines need a type; animals need type, breed, age and purpose', () => {
    expect(KIND_FIELDS.equipment.check('offer', { typeId: null, skills: [], details: {} })).not.toBeNull();
    expect(KIND_FIELDS.equipment.check('offer', { typeId: 'tractor', skills: [], details: {} })).toBeNull();
    const cow = { typeId: 'cow', skills: [], details: { breed: 'राठी', ageYears: 4, purpose: 'dairy' } };
    expect(KIND_FIELDS.livestock.check('offer', cow)).toBeNull();
    expect(KIND_FIELDS.livestock.check('offer', { ...cow, details: { ...cow.details, breed: ' ' } })).not.toBeNull();
  });
});
