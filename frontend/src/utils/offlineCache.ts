import { getDeviceId } from './deviceId';

/**
 * Last good copy of server data in localStorage, so the app can show it without internet.
 * Saved per data id, so one person on a shared phone never sees the copy of another.
 * Every access is wrapped: storage can be full, blocked or missing.
 */
const PREFIX = 'agriai.cache.';

/** Fixed for the life of the page: a late answer of the previous person is saved as theirs, not as the next one's. */
let scope: string | null = null;

function cacheKey(key: string): string {
  scope ??= getDeviceId();
  return `${PREFIX}${scope}:${key}`;
}

/** On start: deletes copies of other data ids (also those saved before copies were per person). */
export function dropOtherPeoplesCache(storage: Storage = localStorage): void {
  try {
    const mine = cacheKey('');
    const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index));
    for (const key of keys) if (key?.startsWith(PREFIX) && !key.startsWith(mine)) storage.removeItem(key);
  } catch {
    // ignore: copies of others are never read anyway
  }
}

export interface Cached<T> {
  data: T;
  /** ISO time the data was saved (i.e. last successful update). */
  savedAt: string;
}

export function saveToCache<T>(key: string, data: T): void {
  try {
    localStorage.setItem(cacheKey(key), JSON.stringify({ data, savedAt: new Date().toISOString() } satisfies Cached<T>));
  } catch {
    // Cache is a convenience; ignore storage errors.
  }
}

export function readFromCache<T>(key: string): Cached<T> | null {
  try {
    const raw = localStorage.getItem(cacheKey(key));
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
