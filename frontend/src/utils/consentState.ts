import { CONSENT_VERSION } from '../api/privacy';

/**
 * Consent is asked once per version of the text. It is remembered on the phone (so the app opens offline) and
 * sent to the server; if sending failed (no internet), it is sent again on the next start.
 */
const ACCEPTED_KEY = 'agriai.consent.accepted';
const PENDING_KEY = 'agriai.consent.pending';

export function hasConsented(storage: Storage = localStorage): boolean {
  try {
    return storage.getItem(ACCEPTED_KEY) === CONSENT_VERSION;
  } catch {
    return false;
  }
}

export function rememberConsent(storage: Storage = localStorage): void {
  try {
    storage.setItem(ACCEPTED_KEY, CONSENT_VERSION);
    storage.setItem(PENDING_KEY, CONSENT_VERSION);
  } catch {
    // Storage blocked: the screen shows again next time, which is safe.
  }
}

export function isConsentPending(storage: Storage = localStorage): boolean {
  try {
    return storage.getItem(PENDING_KEY) === CONSENT_VERSION;
  } catch {
    return false;
  }
}

export function markConsentSent(storage: Storage = localStorage): void {
  try {
    storage.removeItem(PENDING_KEY);
  } catch {
    // ignore
  }
}

/** After "मेरा डेटा मिटाएँ": forget everything this app kept on the phone (a new anonymous id starts fresh). */
export function clearAppStorage(storage: Storage = localStorage): void {
  try {
    const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter((key): key is string => key?.startsWith('agriai.') ?? false);
    for (const key of keys) storage.removeItem(key);
  } catch {
    // ignore
  }
}
