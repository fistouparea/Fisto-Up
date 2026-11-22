import type { IconType } from 'react-icons';
import {
  LuBadgeCheck, LuChartColumn, LuClipboardList, LuEyeOff, LuFlag, LuHandCoins, LuHandshake, LuHistory, LuLandmark,
  LuLayoutDashboard, LuLifeBuoy, LuPackage, LuStore, LuTicket, LuToggleRight, LuTruck, LuUsers,
} from 'react-icons/lu';
import type { Attention } from '../../api/adminConsole';
import type { Flags } from '../../api/flags';
import type { AdminTab } from '../../hooks/useHashRoute';

export type MenuGroup = 'home' | 'people' | 'market' | 'support' | 'system';

export interface MenuItem {
  tab: AdminTab;
  group: MenuGroup;
  icon: IconType;
  /** Features that are switched off stay out of the menu (turn them on again under सुविधाएँ). */
  shown?: (flags: Flags) => boolean;
  /** Waiting work, shown as a number next to the item. */
  waiting?: (attention: Attention) => number;
}

export const MENU_GROUPS: readonly MenuGroup[] = ['home', 'people', 'market', 'support', 'system'];

export const ADMIN_MENU: readonly MenuItem[] = [
  { tab: 'overview', group: 'home', icon: LuLayoutDashboard },
  { tab: 'invites', group: 'people', icon: LuTicket },
  { tab: 'users', group: 'people', icon: LuUsers },
  { tab: 'sellers', group: 'people', icon: LuStore, waiting: (work) => work.pendingSellers },
  { tab: 'listings', group: 'market', icon: LuPackage, waiting: (work) => work.waitingListings },
  { tab: 'orders', group: 'market', icon: LuClipboardList, waiting: (work) => work.newOrders },
  { tab: 'newListing', group: 'market', icon: LuHandshake },
  { tab: 'ledger', group: 'market', icon: LuHandCoins },
  { tab: 'services', group: 'market', icon: LuBadgeCheck, shown: (flags) => flags.equipment || flags.labour || flags.livestock, waiting: (work) => work.serviceApprovals },
  { tab: 'trips', group: 'market', icon: LuTruck, shown: (flags) => flags.mandiPool },
  // One complaint queue. Only while that feature is off, the plain report list ('reports') takes its place.
  { tab: 'complaints', group: 'support', icon: LuFlag, shown: (flags) => flags.complaints, waiting: (work) => work.complaints },
  { tab: 'help', group: 'support', icon: LuLifeBuoy, waiting: (work) => work.helpRequests },
  { tab: 'reports', group: 'support', icon: LuEyeOff },
  { tab: 'pilot', group: 'system', icon: LuChartColumn, shown: (flags) => flags.pilotDashboard },
  { tab: 'schemes', group: 'system', icon: LuLandmark, shown: (flags) => flags.schemes },
  { tab: 'flags', group: 'system', icon: LuToggleRight },
  { tab: 'audit', group: 'system', icon: LuHistory },
];

export function visibleMenu(flags: Flags): MenuItem[] {
  return ADMIN_MENU.filter((item) => !item.shown || item.shown(flags));
}
