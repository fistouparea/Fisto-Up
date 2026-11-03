import { useSyncExternalStore } from 'react';
import { SERVICE_KINDS, type ServiceKind, type ServiceSide } from '../data/serviceKinds';

export const ADMIN_TABS = ['overview', 'pilot', 'sellers', 'orders', 'reports', 'help', 'ledger', 'newListing', 'invites', 'flags', 'audit', 'schemes', 'services', 'trips', 'complaints'] as const;
export type AdminTab = (typeof ADMIN_TABS)[number];

export type Route =
  | { name: 'home' }
  | { name: 'diagnose' }
  | { name: 'history' }
  | { name: 'historyItem'; id: string }
  | { name: 'farm' }
  | { name: 'farmSetup' }
  | { name: 'weather' }
  | { name: 'water' }
  | { name: 'calendar' }
  | { name: 'notifications' }
  | { name: 'login' }
  | { name: 'register' }
  | { name: 'account' }
  | { name: 'sellerProfile' }
  | { name: 'buyerProfile' }
  | { name: 'sell' }
  | { name: 'sellNew' }
  | { name: 'market' }
  | { name: 'listing'; id: string }
  | { name: 'orders' }
  | { name: 'order'; id: string }
  | { name: 'admin'; tab: AdminTab }
  | { name: 'privacy' }
  | { name: 'terms' }
  | { name: 'myData' }
  | { name: 'help' }
  | { name: 'settings' }
  | { name: 'schemes' }
  | { name: 'mandiTrips' }
  | { name: 'delivery'; token: string }
  | { name: 'complaints' }
  | { name: 'complaint'; id: string }
  | { name: 'services'; kind: ServiceKind; side: ServiceSide }
  | { name: 'serviceItem'; id: string }
  | { name: 'serviceBooking'; id: string }
  | { name: 'servicesMine' }
  | { name: 'serviceNew'; kind: ServiceKind; side: ServiceSide };

export const routes = {
  home: '#/',
  diagnose: '#/check',
  history: '#/history',
  historyItem: (id: string) => `#/history/${encodeURIComponent(id)}`,
  farm: '#/farm',
  farmSetup: '#/farm/setup',
  weather: '#/weather',
  water: '#/water',
  calendar: '#/calendar',
  notifications: '#/notifications',
  login: '#/login',
  register: '#/register',
  account: '#/account',
  sellerProfile: '#/account/seller',
  buyerProfile: '#/account/buyer',
  sell: '#/sell',
  sellNew: '#/sell/new',
  market: '#/market',
  listing: (id: string) => `#/market/listing/${encodeURIComponent(id)}`,
  orders: '#/orders',
  order: (id: string) => `#/orders/${encodeURIComponent(id)}`,
  privacy: '#/privacy',
  terms: '#/terms',
  myData: '#/my-data',
  help: '#/help',
  settings: '#/settings',
  schemes: '#/schemes',
  mandiTrips: '#/mandi-trips',
  complaints: '#/complaints',
  complaint: (id: string) => `#/complaints/${encodeURIComponent(id)}`,
  services: (kind: ServiceKind, side: ServiceSide = 'offer') => (side === 'offer' ? `#/services/${kind}` : `#/services/${kind}/need`),
  serviceItem: (id: string) => `#/services/item/${encodeURIComponent(id)}`,
  serviceBooking: (id: string) => `#/services/booking/${encodeURIComponent(id)}`,
  servicesMine: '#/services/my',
  serviceNew: (kind: ServiceKind, side: ServiceSide = 'offer') => `#/services/new/${kind}/${side}`,
  admin: (tab: AdminTab = 'overview') => (tab === 'overview' ? '#/admin' : `#/admin/${tab}`),
};

/**
 * Tiny hash router. Hash URLs keep the phone's back button working
 * without a router library or server config.
 */
export function useHashRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  return parseRoute(hash);
}

export function parseRoute(hash: string): Route {
  const [, section, id, sub, extra] = hash.replace(/^#/, '').split('/');
  if (section === 'services') return parseServiceRoute(id, sub, extra);
  if (section === 'market' && id === 'listing' && sub) return { name: 'listing', id: decodeURIComponent(sub) };
  if (section === 'market') return { name: 'market' };
  if (section === 'admin') return { name: 'admin', tab: ADMIN_TABS.find((tab) => tab === id) ?? 'overview' };
  if (section === 'orders' && id) return { name: 'order', id: decodeURIComponent(id) };
  if (section === 'orders') return { name: 'orders' };
  if (section === 'history' && id) return { name: 'historyItem', id: decodeURIComponent(id) };
  if (section === 'history') return { name: 'history' };
  if (section === 'farm' && id === 'setup') return { name: 'farmSetup' };
  if (section === 'farm') return { name: 'farm' };
  if (section === 'weather') return { name: 'weather' };
  if (section === 'water') return { name: 'water' };
  if (section === 'calendar') return { name: 'calendar' };
  if (section === 'notifications') return { name: 'notifications' };
  if (section === 'check') return { name: 'diagnose' };
  if (section === 'privacy') return { name: 'privacy' };
  if (section === 'terms') return { name: 'terms' };
  if (section === 'my-data') return { name: 'myData' };
  if (section === 'help') return { name: 'help' };
  if (section === 'settings') return { name: 'settings' };
  if (section === 'schemes') return { name: 'schemes' };
  if (section === 'mandi-trips') return { name: 'mandiTrips' };
  if (section === 'delivery' && id) return { name: 'delivery', token: decodeURIComponent(id) };
  if (section === 'complaints' && id) return { name: 'complaint', id: decodeURIComponent(id) };
  if (section === 'complaints') return { name: 'complaints' };
  if (section === 'sell' && id === 'new') return { name: 'sellNew' };
  if (section === 'sell') return { name: 'sell' };
  if (section === 'login') return { name: 'login' };
  if (section === 'register') return { name: 'register' };
  if (section === 'account' && id === 'seller') return { name: 'sellerProfile' };
  if (section === 'account' && id === 'buyer') return { name: 'buyerProfile' };
  if (section === 'account') return { name: 'account' };
  return { name: 'home' };
}

const isKind = (value: string | undefined): value is ServiceKind => SERVICE_KINDS.some((kind) => kind === value);
const toSide = (value: string | undefined): ServiceSide => (value === 'need' ? 'need' : 'offer');

/** #/services/<kind>[/need] · /item/<id> · /booking/<id> · /my · /new/<kind>/<side> */
function parseServiceRoute(id: string | undefined, sub: string | undefined, extra: string | undefined): Route {
  if (id === 'item' && sub) return { name: 'serviceItem', id: decodeURIComponent(sub) };
  if (id === 'booking' && sub) return { name: 'serviceBooking', id: decodeURIComponent(sub) };
  if (id === 'my') return { name: 'servicesMine' };
  if (id === 'new' && isKind(sub)) return { name: 'serviceNew', kind: sub, side: toSide(extra) };
  if (isKind(id)) return { name: 'services', kind: id, side: toSide(sub) };
  return { name: 'home' };
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}
