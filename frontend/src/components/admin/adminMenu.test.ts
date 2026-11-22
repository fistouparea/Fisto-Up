import { describe, expect, it } from 'vitest';
import { DEFAULT_FLAGS, FLAG_KEYS, type Flags } from '../../api/flags';
import { ADMIN_TABS } from '../../hooks/useHashRoute';
import { ADMIN_MENU, visibleMenu } from './adminMenu';

describe('admin menu', () => {
  it('has every panel screen exactly once', () => {
    expect(ADMIN_MENU.map((item) => item.tab).sort()).toEqual([...ADMIN_TABS].sort());
  });

  it('leaves out features that are switched off, never the basics', () => {
    const allOff = { ...DEFAULT_FLAGS, ...Object.fromEntries(FLAG_KEYS.map((key) => [key, false])) } as Flags;
    const tabs = visibleMenu(allOff).map((item) => item.tab);
    for (const hidden of ['services', 'trips', 'schemes', 'pilot', 'complaints']) expect(tabs).not.toContain(hidden);
    for (const basic of ['overview', 'invites', 'users', 'sellers', 'orders', 'reports', 'flags', 'audit']) expect(tabs).toContain(basic);
  });
});
