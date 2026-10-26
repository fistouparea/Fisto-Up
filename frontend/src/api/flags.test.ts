import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_FLAGS, fetchFlags } from './flags';

afterEach(() => vi.unstubAllGlobals());

describe('fetchFlags', () => {
  it('reads the flags for this person and fills unknown ones with the defaults', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ flags: { inviteOnly: true, voiceInput: false, somethingNew: true } })));
    expect(await fetchFlags()).toEqual({ ...DEFAULT_FLAGS, inviteOnly: true, voiceInput: false });
  });

  it('defaults keep everyday features on and pilot-only ones off', () => {
    expect(DEFAULT_FLAGS).toMatchObject({ aiFeedback: true, helpRequests: true, inviteOnly: false, pilotDashboard: false });
  });
});
