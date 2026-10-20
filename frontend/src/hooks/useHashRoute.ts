import { useSyncExternalStore } from 'react';

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
  | { name: 'notifications' };

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
  const [, section, id] = hash.replace(/^#/, '').split('/');
  if (section === 'history' && id) return { name: 'historyItem', id: decodeURIComponent(id) };
  if (section === 'history') return { name: 'history' };
  if (section === 'farm' && id === 'setup') return { name: 'farmSetup' };
  if (section === 'farm') return { name: 'farm' };
  if (section === 'weather') return { name: 'weather' };
  if (section === 'water') return { name: 'water' };
  if (section === 'calendar') return { name: 'calendar' };
  if (section === 'notifications') return { name: 'notifications' };
  if (section === 'check') return { name: 'diagnose' };
  return { name: 'home' };
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}
