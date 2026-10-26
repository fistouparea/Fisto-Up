/**
 * Demo server for load tests and screenshots (PORT=4000 for the Vite preview proxy). The real app with fake AI (answers after AI_DELAY_MS, like a busy Gemini), fake weather, a
 * throwaway in-memory MongoDB replica set with seeded data. Prints "READY <port> <deviceIds...>" when listening.
 */
import { randomUUID } from 'node:crypto';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { PinCredentials } from '../src/modules/auth/credentials.js';
import { UserModel } from '../src/modules/auth/user.model.js';
import { ListingModel } from '../src/modules/listings/listing.model.js';
import { createReadinessCheck } from '../src/observability/health.js';
import type { AiProvider } from '../src/services/ai/aiProvider.js';
import { MongoFarmProfileRepository } from '../src/services/farm/mongoFarmProfileRepository.js';
import { MongoHistoryRepository } from '../src/services/history/mongoHistoryRepository.js';
import { makeForecast } from '../tests/fakes/forecast.js';
import { bajraListingDraft, healthyDiagnosis } from '../tests/helpers.js';

const AI_DELAY_MS = Number(process.env.AI_DELAY_MS ?? 1500);
const FARMERS = 200;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const ai: AiProvider = {
  diagnose: async () => (await wait(AI_DELAY_MS), healthyDiagnosis),
  chat: async () => (await wait(AI_DELAY_MS), 'शाम को छिड़काव करें।'),
  draftListing: async () => (await wait(AI_DELAY_MS), bajraListingDraft),
  estimatePrice: async () => ({ min_rupees: 180, max_rupees: 240, confidence: 'medium' }),
};

const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
mongoose.set('bufferCommands', false);
await mongoose.connect(replSet.getUri(), { dbName: 'agriai_test_loadtest' });
await Promise.all(Object.values(mongoose.models).map((model) => model.init()));

// Seed: farmers with a farm profile and a few saved diagnoses; one verified seller with 60 listings.
const farmProfiles = new MongoFarmProfileRepository();
const history = new MongoHistoryRepository();
const deviceIds = Array.from({ length: FARMERS }, () => randomUUID());
for (const deviceId of deviceIds) {
  await farmProfiles.save(deviceId, {
    location: { lat: 28.3, lon: 74.95, source: 'list', district: 'चूरू', tehsil: 'चूरू' },
    crops: [{ crop: 'bajra', sowingDate: '2026-07-10' }, { crop: 'chana', sowingDate: '2026-10-20' }],
    fieldSizeBigha: 6,
    irrigation: 'tubewell',
  });
  for (let i = 0; i < 3; i++) {
    await history.save({ deviceId, crop: 'bajra', diagnosis: { problem_name: 'झुलसा', explanation: '', desi_upay: [], dawai: [], savdhani: [] } });
  }
}
const auth = new AuthService(new PinCredentials(4));
// Demo coordinator (screenshots): 9000000001 / 2580, as in the seed script.
await auth.createAccount({ phone: '9000000001', pin: '2580', name: 'सुनीता शर्मा', role: 'coordinator' });
const seller = await auth.createAccount({ phone: '9000000101', pin: '4826', name: 'रमेश', role: 'seller', verifiedBy: new mongoose.Types.ObjectId().toString() });
await UserModel.updateOne({ _id: seller._id }, { $set: { 'seller.village': 'घांघू', 'seller.upiId': 'r@okaxis', 'seller.pickup': { lat: 28.3, lon: 74.95, tehsil: 'चूरू' } } });
await ListingModel.insertMany(
  Array.from({ length: 60 }, (_, i) => ({
    sellerId: seller._id,
    sellerVerified: true,
    category: 'crop',
    product: i % 2 ? 'bajra' : 'chana',
    title: { hi: `बाजरा ${i}`, en: `Bajra ${i}` },
    unit: 'quintal',
    pricePerUnitPaise: 2400_00 + i * 100,
    quantityAvailable: 50,
    minOrderQty: 1,
    location: { type: 'Point', coordinates: [74.95, 28.3] },
  })),
);

const app = createApp({
  aiProvider: ai,
  historyRepository: history,
  farmProfiles,
  weather: { getForecast: async () => makeForecast() },
  corsOrigins: ['http://localhost:5173'],
  // The load generator sends a different X-Forwarded-For per request: many phones, not one IP.
  trustProxyHops: 1,
  market: { config: { jwtSecret: 'load-test-secret-load-test-secret!!', cookieSecure: false, commissionBps: 300 } },
  readiness: createReadinessCheck({ mongoConfigured: true, isShuttingDown: () => false }),
});

const server = app.listen(Number(process.env.PORT ?? 0), () => {
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  console.log(`READY ${port} ${deviceIds.join(' ')}`);
});

const stop = async () => {
  server.close();
  await mongoose.disconnect();
  await replSet.stop();
  process.exit(0);
};
process.on('SIGTERM', () => void stop());
process.on('SIGINT', () => void stop());
