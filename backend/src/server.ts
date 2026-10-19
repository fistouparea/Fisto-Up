import { createApp } from './app.js';
import { loadEnv } from './config/env.js';
import { connectMongo } from './db/mongo.js';
import { createAiProvider } from './services/ai/createAiProvider.js';
import { MongoFarmProfileRepository } from './services/farm/mongoFarmProfileRepository.js';
import { MongoHistoryRepository } from './services/history/mongoHistoryRepository.js';
import { OpenMeteoProvider } from './services/weather/openMeteoProvider.js';

const env = loadEnv();

if (env.MONGO_URI) {
  connectMongo(env.MONGO_URI);
} else {
  console.warn('MONGO_URI is not set: history and "मेरा खेत" are turned off.');
}

const app = createApp({
  aiProvider: createAiProvider(env),
  historyRepository: env.MONGO_URI ? new MongoHistoryRepository() : null,
  farmProfiles: env.MONGO_URI ? new MongoFarmProfileRepository() : null,
  weather: new OpenMeteoProvider(),
  corsOrigins: env.CORS_ORIGIN,
  trustProxyHops: env.TRUST_PROXY,
});

app.listen(env.PORT, () => {
  console.log(`AgriAI backend running on http://localhost:${env.PORT}`);
});
