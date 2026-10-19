/** Dates are handled as "YYYY-MM-DD" strings in India time, so day boundaries match the farmer's day. */
export type IsoDate = string;

const MS_PER_DAY = 86_400_000;

const indiaDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Today's date in India, e.g. "2026-10-19". */
export function todayInIndia(now: Date = new Date()): IsoDate {
  return indiaDateFormatter.format(now);
}

/** Whole days from `from` to `to` (negative if `to` is earlier). */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / MS_PER_DAY);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * MS_PER_DAY).toISOString().slice(0, 10);
}
