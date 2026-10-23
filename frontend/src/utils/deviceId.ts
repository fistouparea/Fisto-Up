const STORAGE_KEY = 'agriai.deviceId';

/** Used when localStorage is blocked (private mode etc.): history then lasts for this visit only. */
let fallbackId: string | null = null;

/** Anonymous id for this phone, created on first visit. No personal data is involved. */
export function getDeviceId(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && UUID_PATTERN.test(stored)) return stored;

    const id = createUuid();
    localStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    fallbackId ??= createUuid();
    return fallbackId;
  }
}

/**
 * After login on another phone, this phone uses the account's device id, so the farm profile and
 * "मेरी जाँच" of the account show up here too.
 */
export function adoptDeviceId(id: string): void {
  if (!UUID_PATTERN.test(id)) return;
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    fallbackId = id;
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Random UUID v4. crypto.randomUUID only exists on HTTPS pages, and phones testing over
 * http://192.168.x.x are not, so this builds one from crypto.getRandomValues.
 */
export function createUuid(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40; // version 4
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80; // RFC 4122 variant
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
