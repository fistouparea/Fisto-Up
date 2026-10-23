import mongoose from 'mongoose';

const RETRY_DELAY_MS = 15_000;

/**
 * Connects to MongoDB in the background and keeps retrying if it is down at startup.
 * Queries fail immediately while disconnected (no buffering), so a missing database
 * never blocks a diagnosis.
 */
export function connectMongo(uri: string): void {
  mongoose.set('bufferCommands', false);
  mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));
  mongoose.connection.on('reconnected', () => console.log('MongoDB reconnected'));

  const tryConnect = async () => {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5_000 });
      console.log('MongoDB connected');
      await warnIfNoReplicaSet();
    } catch (error) {
      console.error(`MongoDB not reachable, history is off. Retrying in ${RETRY_DELAY_MS / 1000}s.`, errorMessage(error));
      setTimeout(() => void tryConnect(), RETRY_DELAY_MS).unref();
    }
  };
  void tryConnect();
}

/** Marketplace orders use transactions, which need a replica set (docker compose sets one up). */
async function warnIfNoReplicaSet(): Promise<void> {
  const hello = await mongoose.connection.db?.admin().command({ hello: 1 });
  if (hello && !hello.setName) {
    console.warn('MongoDB is not a replica set: marketplace orders cannot be accepted. See README "MongoDB replica set".');
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
