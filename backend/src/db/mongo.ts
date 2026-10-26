import mongoose from 'mongoose';
import { logger } from '../observability/logger.js';

const RETRY_DELAY_MS = 15_000;

/** Database commands slower than this are logged as warnings ("slow query"), with collection and duration. */
export const SLOW_QUERY_MS = 300;

/**
 * Connects to MongoDB in the background and keeps retrying if it is down at startup.
 * Queries fail immediately while disconnected (no buffering), so a missing database
 * never blocks a diagnosis.
 */
export function connectMongo(uri: string): void {
  mongoose.set('bufferCommands', false);
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
  mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected'));

  const tryConnect = async () => {
    try {
      // Works the same with local MongoDB and Atlas (mongodb+srv://..., TLS and retryable writes by default).
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5_000, appName: 'agriai-backend', monitorCommands: true });
      watchSlowQueries();
      logger.info('MongoDB connected');
      await warnIfNoReplicaSet();
    } catch (error) {
      logger.error({ err: error, retryInSeconds: RETRY_DELAY_MS / 1000 }, 'MongoDB not reachable, history is off');
      setTimeout(() => void tryConnect(), RETRY_DELAY_MS).unref();
    }
  };
  void tryConnect();
}

let watching = false;

/** Logs every database command that took longer than SLOW_QUERY_MS, with its collection (never its filter values). */
function watchSlowQueries(): void {
  if (watching) return;
  watching = true;
  const client = mongoose.connection.getClient();
  // The collection is only in the "started" event; remember it until the command ends.
  const collections = new Map<number, string>();
  client.on('commandStarted', (event) => {
    const target: unknown = event.command[event.commandName];
    if (typeof target === 'string') collections.set(event.requestId, target);
  });
  client.on('commandFailed', (event) => collections.delete(event.requestId));
  client.on('commandSucceeded', (event) => {
    const collection = collections.get(event.requestId);
    collections.delete(event.requestId);
    if (event.duration >= SLOW_QUERY_MS) {
      logger.warn({ command: event.commandName, collection, durationMs: Math.round(event.duration) }, 'slow database query');
    }
  });
}

/** Marketplace orders use transactions, which need a replica set (docker compose sets one up). */
async function warnIfNoReplicaSet(): Promise<void> {
  const hello = await mongoose.connection.db?.admin().command({ hello: 1 });
  if (hello && !hello.setName) {
    logger.warn('MongoDB is not a replica set: marketplace orders cannot be accepted. See README "MongoDB replica set".');
  }
}
