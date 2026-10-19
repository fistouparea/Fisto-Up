/**
 * Last good copy of server data in localStorage, so the app can show it without internet.
 * Every access is wrapped: storage can be full, blocked or missing.
 */
const PREFIX = 'agriai.cache.';

export interface Cached<T> {
  data: T;
  /** ISO time the data was saved (i.e. last successful update). */
  savedAt: string;
}

export function saveToCache<T>(key: string, data: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ data, savedAt: new Date().toISOString() } satisfies Cached<T>));
  } catch {
    // Cache is a convenience; ignore storage errors.
  }
}

export function readFromCache<T>(key: string): Cached<T> | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && 'data' in parsed && 'savedAt' in parsed) {
      return parsed as Cached<T>;
    }
    return null;
  } catch {
    return null;
  }
}

/** Small per-device flags (e.g. onboarding skipped). */
export function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(`agriai.flag.${key}`) === '1';
  } catch {
    return false;
  }
}

export function setFlag(key: string): void {
  try {
    localStorage.setItem(`agriai.flag.${key}`, '1');
  } catch {
    // ignore
  }
}
