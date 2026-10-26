const KEY = 'agriai.kitReferrals';

function read(): string[] {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(KEY) ?? '[]');
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

/** The farmer opened this listing from "ज़रूरी सामान": an order from it is a partner referral. */
export function rememberKitReferral(listingId: string): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify([...new Set([...read(), listingId])].slice(-20)));
  } catch {
    // Not remembered: the order is then a normal order.
  }
}

export function isKitReferral(listingId: string): boolean {
  return read().includes(listingId);
}
