import { useSyncExternalStore } from 'react';

export type Route = { name: 'diagnose' } | { name: 'history' } | { name: 'historyItem'; id: string };

export const routes = {
  diagnose: '#/',
  history: '#/history',
  historyItem: (id: string) => `#/history/${encodeURIComponent(id)}`,
};

/**
 * Tiny hash router: "#/", "#/history", "#/history/<id>".
 * Hash URLs keep the phone's back button working without a router library or server config.
 */
export function useHashRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  return parseRoute(hash);
}

export function parseRoute(hash: string): Route {
  const [, section, id] = hash.replace(/^#/, '').split('/');
  if (section === 'history' && id) return { name: 'historyItem', id: decodeURIComponent(id) };
  if (section === 'history') return { name: 'history' };
  return { name: 'diagnose' };
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}
