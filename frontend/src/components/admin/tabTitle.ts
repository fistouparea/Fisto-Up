import type { Flags } from '../../api/flags';
import type { AdminTab } from '../../hooks/useHashRoute';
import { hiAdmin } from '../../strings/hiAdmin';

/** With the complaint queue on, 'reports' is only the list of hidden listings. */
export function tabTitle(tab: AdminTab, flags: Flags): string {
  return tab === 'reports' && flags.complaints ? hiAdmin.hiddenListings : hiAdmin.tabs[tab];
}
