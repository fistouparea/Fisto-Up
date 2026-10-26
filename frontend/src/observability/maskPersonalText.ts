/** Phone numbers, tokens and long data blobs never go into error reports (mirrors backend/src/observability/redact.ts). */
const PATTERNS: [RegExp, string][] = [
  [/(?<![\d])(?:\+?91[\s-]?|0)?[6-9]\d{4}[\s-]?\d{5}(?![\d])/g, '[phone]'],
  [/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[token]'],
  [/[A-Za-z0-9+/=]{200,}/g, '[data]'],
];

export function maskPersonalText(text: string): string {
  return PATTERNS.reduce((masked, [pattern, replacement]) => masked.replace(pattern, replacement), text);
}
