/**
 * Personal data must never reach logs or error tracking: PINs, session tokens, phone numbers, photos.
 * Structured fields are removed by path (pino `redact`); free text such as error messages (a MongoDB
 * duplicate-key error quotes the phone number) is masked with `maskPersonalText`.
 */

/** Paths removed from every log line (pino `redact` syntax). */
export const REDACT_PATHS = [
  'req.headers.cookie',
  'req.headers.authorization',
  'res.headers["set-cookie"]',
  '*.pin',
  '*.pinHash',
  '*.phone',
  '*.token',
  '*.password',
  '*.image',
  '*.photo',
  '*.buffer',
  '*.subscription',
];

/** Database passwords in URIs, Indian mobile numbers (optionally +91/0), JWTs and long base64 blobs (photos). */
const PATTERNS: [RegExp, string][] = [
  [/(mongodb(?:\+srv)?:\/\/)[^@\s/]+@/g, '$1[credentials]@'],
  [/(?<![\d])(?:\+?91[\s-]?|0)?[6-9]\d{4}[\s-]?\d{5}(?![\d])/g, '[phone]'],
  [/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[token]'],
  [/[A-Za-z0-9+/=]{200,}/g, '[data]'],
];

export function maskPersonalText(text: string): string {
  return PATTERNS.reduce((masked, [pattern, replacement]) => masked.replace(pattern, replacement), text);
}
