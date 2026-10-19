import { hi } from '../strings/hi';
import { daysBetween, todayInIndia } from './indiaDate';

const weekday = new Intl.DateTimeFormat('hi-IN', { weekday: 'short', timeZone: 'UTC' });
const dayMonth = new Intl.DateTimeFormat('hi-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/** "आज", "कल", or a short weekday like "बुध". */
export function dayLabel(date: string, today: string = todayInIndia()): string {
  const offset = daysBetween(today, date);
  if (offset === 0) return hi.weather.today;
  if (offset === 1) return hi.weather.tomorrow;
  return weekday.format(new Date(`${date}T00:00:00Z`));
}

/** e.g. "22 अक्टू॰" */
export function shortDate(date: string): string {
  return dayMonth.format(new Date(`${date}T00:00:00Z`));
}
