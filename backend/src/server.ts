import type { Server } from 'node:http';
import mongoose from 'mongoose';
import type { ScheduledTask } from 'node-cron';
import { createApp } from './app.js';
import { loadEnv, marketConfig, vapidConfig, type Env } from './config/env.js';
import { connectMongo } from './db/mongo.js';
import { startPhotoCleanup } from './jobs/photoCleanup.js';
import { startNotificationScheduler } from './jobs/scheduler.js';
import { createPhotoStorage } from './services/storage/createPhotoStorage.js';
import { createReadinessCheck } from './observability/health.js';
import { logger } from './observability/logger.js';
import { flushSentry, initSentry } from './observability/sentry.js';
import { createAiProvider } from './services/ai/createAiProvider.js';
import { MongoFarmProfileRepository } from './services/farm/mongoFarmProfileRepository.js';
import { MongoHistoryRepository } from './services/history/mongoHistoryRepository.js';
import { AgmarknetProvider } from './services/mandi/agmarknetProvider.js';
import { MongoPushSubscriptionRepository } from './services/push/mongoPushSubscriptionRepository.js';
import { WebPushSender } from './services/push/pushSender.js';
import { OpenMeteoProvider } from './services/weather/openMeteoProvider.js';

/** Render and Docker send SIGTERM and wait ~30 s; finish open requests well before that. */
const SHUTDOWN_TIMEOUT_MS = 10_000;

const env = loadEnvOrExit();
initSentry({ dsn: env.SENTRY_DSN, environment: env.SENTRY_ENVIRONMENT ?? env.NODE_ENV, release: env.RENDER_GIT_COMMIT });
const vapid = vapidConfig(env);
const market = marketConfig(env);
const photoStorage = createPhotoStorage(env);

if (env.MONGO_URI) {
  connectMongo(env.MONGO_URI);
} else {
  logger.warn('MONGO_URI is not set: history, "मेरा खेत" and push are turned off.');
}

const historyRepository = env.MONGO_URI ? new MongoHistoryRepository() : null;
const farmProfiles = env.MONGO_URI ? new MongoFarmProfileRepository() : null;
const subscriptions = env.MONGO_URI && vapid ? new MongoPushSubscriptionRepository() : null;
const weather = new OpenMeteoProvider();
let shuttingDown = false;

const app = createApp({
  aiProvider: createAiProvider(env),
  historyRepository,
  farmProfiles,
  weather,
  mandi: env.DATA_GOV_API_KEY ? new AgmarknetProvider({ apiKey: env.DATA_GOV_API_KEY }) : null,
  push: { publicKey: vapid?.publicKey ?? null, subscriptions },
  market: market ? { config: market, pushSender: vapid ? new WebPushSender(vapid) : null, photoStorage } : null,
  corsOrigins: env.CORS_ORIGIN,
  trustProxyHops: env.TRUST_PROXY,
  readiness: createReadinessCheck({ mongoConfigured: Boolean(env.MONGO_URI), isShuttingDown: () => shuttingDown }),
});

const jobs: ScheduledTask[] = [];
if (market) jobs.push(startPhotoCleanup(photoStorage));
if (vapid && farmProfiles && subscriptions) {
  jobs.push(startNotificationScheduler({ farmProfiles, history: historyRepository, weather, subscriptions, sender: new WebPushSender(vapid) }));
} else {
  logger.warn('Web push is off (needs MONGO_URI and VAPID_* in .env). In-app notifications still work.');
}

if (env.NODE_ENV === 'production' && photoStorage.name === 'database') {
  logger.warn('Listing photos are stored in MongoDB. On Atlas free tier (512 MB) use STORAGE_PROVIDER=cloudinary.');
}
if (!market) {
  logger.warn('Marketplace is off (needs MONGO_URI and JWT_SECRET in .env). The advisor still works.');
}
if (env.NODE_ENV === 'production' && env.CORS_ORIGIN.some((origin) => origin.startsWith('http:'))) {
  logger.warn('CORS_ORIGIN uses http:// in production. Use https:// for the real deployment.');
}
if (env.NODE_ENV === 'production' && market && !market.cookieSecure) {
  logger.warn('COOKIE_SECURE=false in production: login cookies also travel over plain http. Only for local testing.');
}

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, `AgriAI backend running on http://localhost:${env.PORT}`);
});
// Slow phones on 2G upload photos slowly; but never keep idle sockets open forever.
server.requestTimeout = 120_000;
server.headersTimeout = 30_000;

process.on('SIGTERM', () => void shutdown('SIGTERM', server));
process.on('SIGINT', () => void shutdown('SIGINT', server));
process.on('unhandledRejection', (reason) => logger.error({ err: reason }, 'unhandled promise rejection'));
process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'uncaught exception, shutting down');
  void shutdown('uncaughtException', server, 1);
});

/**
 * Graceful shutdown: /ready turns 503 (the platform stops sending traffic), no new connections are accepted,
 * open requests finish, the push job stops, MongoDB and Sentry are closed. Forced exit after 10 s.
 */
async function shutdown(signal: string, httpServer: Server, exitCode = 0): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'shutting down');
  setTimeout(() => {
    logger.error('shutdown took too long, exiting');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS).unref();

  await Promise.all(jobs.map((job) => job.stop()));
  await new Promise<void>((resolve) => {
    httpServer.close(() => resolve());
    httpServer.closeIdleConnections();
  });
  await mongoose.disconnect().catch((error: unknown) => logger.error({ err: error }, 'MongoDB disconnect failed'));
  await flushSentry(2_000);
  logger.info('shutdown complete');
  process.exit(exitCode);
}

/** Refuses to start with missing or invalid settings: prints what is wrong (never the values) and exits. */
function loadEnvOrExit(): Env {
  try {
    return loadEnv();
  } catch (error) {
    logger.fatal(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
