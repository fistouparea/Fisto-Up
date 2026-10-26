import mongoose from 'mongoose';

export type CheckStatus = 'ok' | 'down' | 'off';

export interface Readiness {
  status: 'ok' | 'down';
  checks: Record<string, CheckStatus>;
}

export type ReadinessCheck = () => Promise<Readiness>;

const PING_TIMEOUT_MS = 2_000;

/** MongoDB answers a ping within 2 s. "off" when MONGO_URI is not configured (the advisor still works). */
export async function checkMongo(configured: boolean): Promise<CheckStatus> {
  if (!configured) return 'off';
  const db = mongoose.connection.db;
  if (mongoose.connection.readyState !== mongoose.ConnectionStates.connected || !db) return 'down';
  try {
    await Promise.race([
      db.admin().ping(),
      new Promise((_resolve, reject) => setTimeout(() => reject(new Error('ping timeout')), PING_TIMEOUT_MS).unref()),
    ]);
    return 'ok';
  } catch {
    return 'down';
  }
}

/** Ready = every configured dependency answers, and the server is not shutting down. */
export function createReadinessCheck({ mongoConfigured, isShuttingDown }: { mongoConfigured: boolean; isShuttingDown: () => boolean }): ReadinessCheck {
  return async () => {
    const checks: Record<string, CheckStatus> = { database: await checkMongo(mongoConfigured) };
    if (isShuttingDown()) checks.server = 'down';
    return { status: Object.values(checks).includes('down') ? 'down' : 'ok', checks };
  };
}
