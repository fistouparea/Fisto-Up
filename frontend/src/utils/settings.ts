/** Per-phone app settings (kept on the phone only). */
export interface AppSettings {
  /** "पढ़कर सुनाएँ": read each new screen's main content aloud. */
  readAloud: boolean;
  /** AI answers (chat) in Rajasthani instead of Hindi. */
  rajasthaniAnswers: boolean;
}

const KEY = 'agriai.settings';
const DEFAULTS: AppSettings = { readAloud: false, rajasthaniAnswers: false };
const listeners = new Set<() => void>();
let current: AppSettings = read();

function read(): AppSettings {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    if (typeof value !== 'object' || value === null) return DEFAULTS;
    const stored = value as Partial<Record<keyof AppSettings, unknown>>;
    return {
      readAloud: stored.readAloud === true,
      rajasthaniAnswers: stored.rajasthaniAnswers === true,
    };
  } catch {
    return DEFAULTS;
  }
}

export function getSettings(): AppSettings {
  return current;
}

export function updateSettings(change: Partial<AppSettings>): void {
  current = { ...current, ...change };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    // Not saved: the setting lasts for this visit.
  }
  listeners.forEach((listener) => listener());
}

export function subscribeSettings(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** For tests: read again from storage. */
export function reloadSettings(): void {
  current = read();
}
