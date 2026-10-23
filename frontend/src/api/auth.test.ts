import { describe, expect, it } from 'vitest';
import { isAccountResponse } from './auth';

describe('isAccountResponse', () => {
  it('accepts a user or null', () => {
    expect(isAccountResponse({ user: null })).toBe(true);
    expect(isAccountResponse({ user: { id: 'u1', role: 'seller' } })).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isAccountResponse({})).toBe(false);
    expect(isAccountResponse({ user: { role: 'seller' } })).toBe(false);
    expect(isAccountResponse(null)).toBe(false);
  });
});
