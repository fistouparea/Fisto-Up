/** One CSV cell, safe for Excel: formulas (=, +, -, @) are disarmed and quotes/commas escaped. */
export function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** A whole CSV file. The BOM makes Excel read Hindi text correctly. */
export function toCsv(header: string[], rows: (string | number)[][]): string {
  return `\uFEFF${[header, ...rows].map((cells) => cells.map((cell) => csvCell(String(cell))).join(',')).join('\r\n')}\r\n`;
}
