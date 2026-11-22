import type { Invite } from '../api/pilotAdmin';

export type InviteStatus = 'active' | 'usedUp' | 'expired' | 'revoked';

/** Why a code works or not. ("खत्म" used to mean both used up and out of date.) */
export function inviteStatus(invite: Pick<Invite, 'revoked' | 'uses' | 'maxUses' | 'usable'>): InviteStatus {
  if (invite.revoked) return 'revoked';
  if (invite.uses >= invite.maxUses) return 'usedUp';
  return invite.usable ? 'active' : 'expired';
}
