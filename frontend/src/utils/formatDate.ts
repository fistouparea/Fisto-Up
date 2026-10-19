const formatter = new Intl.DateTimeFormat('hi-IN', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'Asia/Kolkata',
});

/** e.g. "19 अक्टूबर 2026, 4:30 pm" */
export function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return Number.isNaN(date.getTime()) ? '' : formatter.format(date);
}
