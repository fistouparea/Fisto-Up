/**
 * Safety rules for `npm run demo:reset`, which DROPS a whole database before seeding demo data.
 * It only ever runs on a database whose name starts with "agriai_demo", and never with NODE_ENV=production.
 */
export const DEMO_DB_PREFIX = 'agriai_demo';

/** The database name in a mongodb:// or mongodb+srv:// URI ("" when the URI names none). */
export function databaseName(uri: string): string | null {
  const match = /^mongodb(?:\+srv)?:\/\/[^/]+(?:\/([^?]*))?/.exec(uri.trim());
  if (!match) return null;
  return decodeURIComponent(match[1] ?? '');
}

/** Why the reset must not run (Hinglish, for the terminal), or null when it is safe. */
export function demoResetProblem(uri: string | undefined, nodeEnv: string | undefined): string | null {
  if (nodeEnv === 'production') return 'NODE_ENV=production hai: demo reset production mein kabhi nahi chalta.';
  if (!uri) return 'DEMO_MONGO_URI (ya MONGO_URI) set nahi hai.';
  const name = databaseName(uri);
  if (name === null) return 'Database URI samajh nahi aaya (mongodb:// ya mongodb+srv:// chahiye).';
  if (!name.startsWith(DEMO_DB_PREFIX)) {
    return `Database "${name || '(koi naam nahi)'}" demo database nahi hai. Sirf "${DEMO_DB_PREFIX}…" naam wala database reset hota hai, jaise mongodb://localhost:27017/${DEMO_DB_PREFIX}`;
  }
  return null;
}
