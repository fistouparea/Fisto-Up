import { adoptDeviceId } from './deviceId';

/** What belongs to a person, not to the phone (language, consent and other phone settings stay). */
const PERSONAL_PREFIXES = ['agriai.cache.', 'agriai.readNotifications'];

/**
 * Login, logout or an expired login: the phone moves to another person's data id and forgets what it kept of the
 * previous one. False: storage is blocked, so the id would not survive a page reload.
 */
export function switchPerson(deviceId: string): boolean {
  forget(() => localStorage, PERSONAL_PREFIXES);
  forget(() => sessionStorage, ['agriai.']);
  return adoptDeviceId(deviceId);
}

function forget(getStorage: () => Storage, prefixes: string[]): void {
  try {
    const storage = getStorage();
    const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index));
    for (const key of keys) if (key && prefixes.some((prefix) => key.startsWith(prefix))) storage.removeItem(key);
  } catch {
    // Storage blocked: nothing was saved there.
  }
}

const LOGOUT_PENDING_KEY = 'agriai.logoutPending';

/**
 * Logout without internet: the login cookie (httpOnly) is still there. Until the server ended that session the
 * phone counts as logged out and tries again on every start.
 */
export function setLogoutPending(pending: boolean): void {
  try {
    if (pending) localStorage.setItem(LOGOUT_PENDING_KEY, '1');
    else localStorage.removeItem(LOGOUT_PENDING_KEY);
  } catch {
    // ignore
  }
}

export function isLogoutPending(): boolean {
  try {
    return localStorage.getItem(LOGOUT_PENDING_KEY) === '1';
  } catch {
    return false;
  }
}
