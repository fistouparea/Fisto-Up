import { beforeEach, describe, expect, it } from 'vitest';
import { isKitReferral, rememberKitReferral } from './kitReferral';
import { memoryStorage } from '../test/memoryStorage';

describe('kit referral', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'sessionStorage', { value: memoryStorage(), configurable: true });
  });

  it('remembers listings opened from "ज़रूरी सामान" only', () => {
    rememberKitReferral('a1');
    expect(isKitReferral('a1')).toBe(true);
    expect(isKitReferral('b2')).toBe(false);
  });
});
