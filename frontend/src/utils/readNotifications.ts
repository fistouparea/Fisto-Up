/** Ids of notifications the farmer has seen, kept on the phone (no login needed). */
const KEY = 'agriai.readNotifications';
const MAX_IDS = 300;

export function loadReadIds(): Set<string> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return new Set(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []);
  } catch {
    return new Set();
  }
}

export function saveReadIds(ids: Set<string>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify([...ids].slice(-MAX_IDS)));
  } catch {
    // ignore: read state is a convenience
  }
}
