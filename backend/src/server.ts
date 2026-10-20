import { createApp } from './app.js';
import { loadEnv, vapidConfig } from './config/env.js';
import { connectMongo } from './db/mongo.js';
import { startNotificationScheduler } from './jobs/scheduler.js';
import { createAiProvider } from './services/ai/createAiProvider.js';
import { MongoFarmProfileRepository } from './services/farm/mongoFarmProfileRepository.js';
import { MongoHistoryRepository } from './services/history/mongoHistoryRepository.js';
import { AgmarknetProvider } from './services/mandi/agmarknetProvider.js';
import { MongoPushSubscriptionRepository } from './services/push/mongoPushSubscriptionRepository.js';
import { WebPushSender } from './services/push/pushSender.js';
import { OpenMeteoProvider } from './services/weather/openMeteoProvider.js';

const env = loadEnv();
const vapid = vapidConfig(env);

if (env.MONGO_URI) {
  connectMongo(env.MONGO_URI);
} else {
  console.warn('MONGO_URI is not set: history, "मेरा खेत" and push are turned off.');
}

const historyRepository = env.MONGO_URI ? new MongoHistoryRepository() : null;
const farmProfiles = env.MONGO_URI ? new MongoFarmProfileRepository() : null;
const subscriptions = env.MONGO_URI && vapid ? new MongoPushSubscriptionRepository() : null;
const weather = new OpenMeteoProvider();

const app = createApp({
  aiProvider: createAiProvider(env),
  historyRepository,
  farmProfiles,
  weather,
  mandi: env.DATA_GOV_API_KEY ? new AgmarknetProvider({ apiKey: env.DATA_GOV_API_KEY }) : null,
  push: { publicKey: vapid?.publicKey ?? null, subscriptions },
  corsOrigins: env.CORS_ORIGIN,
  trustProxyHops: env.TRUST_PROXY,
});

if (vapid && farmProfiles && subscriptions) {
  startNotificationScheduler({ farmProfiles, history: historyRepository, weather, subscriptions, sender: new WebPushSender(vapid) });
} else {
  console.warn('Web push is off (needs MONGO_URI and VAPID_* in .env). In-app notifications still work.');
}

app.listen(env.PORT, () => {
  console.log(`AgriAI backend running on http://localhost:${env.PORT}`);
});
