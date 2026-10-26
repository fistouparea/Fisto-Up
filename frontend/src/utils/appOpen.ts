import { isRecord, postJson } from '../api/client';
import { getDeviceId } from './deviceId';
import { todayInIndia } from './indiaDate';

const KEY = 'agriai.appOpen.day';

/** True if "app opened" was not reported yet today (India date), and remembers that it now is. */
export function shouldReportAppOpen(storage: Storage = localStorage, today: string = todayInIndia()): boolean {
  try {
    if (storage.getItem(KEY) === today) return false;
    storage.setItem(KEY, today);
    return true;
  } catch {
    return false; // storage blocked: do not report on every start
  }
}

/** Counts this phone as active today for the pilot dashboard (anonymous; at most once a day; ignores failures). */
export function reportAppOpen(): void {
  if (!shouldReportAppOpen()) return;
  postJson('/api/events', { name: 'app_open', deviceId: getDeviceId() }, isRecord).catch(() => undefined);
}
