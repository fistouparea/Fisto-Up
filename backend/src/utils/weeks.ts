import { addDays, todayInIndia, type IsoDate } from './dates.js';

/** Monday of the week (India time) as "YYYY-MM-DD". Weeks run Monday–Sunday. */
export function weekOf(now: Date = new Date()): IsoDate {
  const today = todayInIndia(now);
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDays(today, -((weekday + 6) % 7));
}

/** The last `count` week starts, oldest first, ending with the current week. */
export function lastWeeks(count: number, now: Date = new Date()): IsoDate[] {
  const current = weekOf(now);
  return Array.from({ length: count }, (_, index) => addDays(current, -7 * (count - 1 - index)));
}

/** Start of a week as an instant (Monday 00:00 India = Sunday 18:30 UTC). */
export function weekStartInstant(week: IsoDate): Date {
  return new Date(`${week}T00:00:00+05:30`);
}
