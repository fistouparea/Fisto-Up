import { createApp } from './app.js';
import { loadEnv } from './config/env.js';
import { connectMongo } from './db/mongo.js';
import { createAiProvider } from './services/ai/createAiProvider.js';
import { MongoHistoryRepository } from './services/history/mongoHistoryRepository.js';

const env = loadEnv();

if (env.MONGO_URI) {
  connectMongo(env.MONGO_URI);
} else {
  console.warn('MONGO_URI is not set: diagnosis history is turned off.');
}

const app = createApp({
  aiProvider: createAiProvider(env),
  historyRepository: env.MONGO_URI ? new MongoHistoryRepository() : null,
  corsOrigins: env.CORS_ORIGIN,
  trustProxyHops: env.TRUST_PROXY,
});

app.listen(env.PORT, () => {
  console.log(`AgriAI backend running on http://localhost:${env.PORT}`);
});
