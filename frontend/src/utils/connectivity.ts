/**
 * Is the server reachable, and when did we last get fresh data?
 * Fed by every API call (see api/client.ts) and the browser's online/offline events.
 * A tiny external store, read with useSyncExternalStore (hooks/useConnectivity.ts).
 */
const LAST_SYNC_KEY = 'agriai.lastSync';

export interface Connectivity {
  offline: boolean;
  /** ISO time of the last successful server response, or null. */
  lastSync: string | null;
}

let state: Connectivity = { offline: typeof navigator !== 'undefined' && navigator.onLine === false, lastSync: readLastSync() };
const listeners = new Set<() => void>();

export function getConnectivity(): Connectivity {
  return state;
}

export function subscribeConnectivity(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The server answered (any status): we are online. */
export function reportServerReached(): void {
  const lastSync = new Date().toISOString();
  try {
    localStorage.setItem(LAST_SYNC_KEY, lastSync);
  } catch {
    // ignore
  }
  update({ offline: false, lastSync });
}

/** A request could not reach the server at all. */
export function reportNetworkFailure(): void {
  update({ ...state, offline: true });
}

function update(next: Connectivity): void {
  if (next.offline === state.offline && next.lastSync === state.lastSync) return;
  state = next;
  listeners.forEach((listener) => listener());
}

function readLastSync(): string | null {
  try {
    return localStorage.getItem(LAST_SYNC_KEY);
  } catch {
    return null;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('offline', reportNetworkFailure);
  // "online" only means a network exists; the next successful request confirms the server.
  window.addEventListener('online', () => update({ ...state, offline: false }));
}
