const TIME_ZONE = 'Asia/Kolkata';

const dateFormatter = new Intl.DateTimeFormat('hi-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: TIME_ZONE });
const timeFormatter = new Intl.DateTimeFormat('hi-IN', { hour: 'numeric', minute: '2-digit', timeZone: TIME_ZONE });

/** e.g. "19 अक्टूबर 2026 · 4:30 pm" (short enough for one line on a 360px phone). */
export function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';
  return `${dateFormatter.format(date)} · ${timeFormatter.format(date)}`;
}
