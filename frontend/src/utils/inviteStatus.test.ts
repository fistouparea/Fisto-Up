import { expect, it } from 'vitest';
import { inviteStatus } from './inviteStatus';

it('tells why an invite code works or not', () => {
  const code = { revoked: false, uses: 0, maxUses: 2, usable: true };
  expect(inviteStatus(code)).toBe('active');
  expect(inviteStatus({ ...code, uses: 2, usable: false })).toBe('usedUp');
  expect(inviteStatus({ ...code, usable: false })).toBe('expired');
  expect(inviteStatus({ ...code, revoked: true, usable: false })).toBe('revoked');
});
