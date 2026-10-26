import { describe, expect, it } from 'vitest';
import { CONSENT_VERSION } from '../api/privacy';
import { memoryStorage } from '../test/memoryStorage';
import { clearAppStorage, hasConsented, isConsentPending, markConsentSent, rememberConsent } from './consentState';

describe('consent state on the phone', () => {
  it('asks until accepted, then remembers this version and queues it for the server', () => {
    const storage = memoryStorage();
    expect(hasConsented(storage)).toBe(false);
    rememberConsent(storage);
    expect(hasConsented(storage)).toBe(true);
    expect(isConsentPending(storage)).toBe(true);
    markConsentSent(storage);
    expect(isConsentPending(storage)).toBe(false);
  });

  it('asks again when the consent text has a new version', () => {
    const storage = memoryStorage();
    storage.setItem('agriai.consent.accepted', 'older-version');
    expect(hasConsented(storage)).toBe(false);
    expect(CONSENT_VERSION).not.toBe('older-version');
  });

  it('clearing after data deletion removes only this app’s keys', () => {
    const storage = memoryStorage();
    storage.setItem('agriai.deviceId', 'x');
    storage.setItem('agriai.cache.dashboard', '{}');
    storage.setItem('other-app', 'keep');
    rememberConsent(storage);
    clearAppStorage(storage);
    expect(storage.length).toBe(1);
    expect(storage.getItem('other-app')).toBe('keep');
  });
});
