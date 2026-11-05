/**
 * Backend for the Playwright E2E tests (frontend/e2e): the real app with a fake AI, fake weather and no mandi
 * key, on a throwaway in-memory MongoDB replica set filled by the real seed script (npm run seed). Every
 * Phase 5/6 feature flag is on for everyone. Listens on PORT (default 4000) and prints "E2E READY".
 * It never touches the MongoDB on this machine.
 */
import { spawn } from 'node:child_process';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { FEATURE_FLAGS, FLAG_KEYS, flagDefaults, type FlagState } from '../src/config/featureFlags.js';
import { FeatureFlags } from '../src/modules/flags/flag.service.js';
import { PinCredentials } from '../src/modules/auth/credentials.js';
import type { AiProvider } from '../src/services/ai/aiProvider.js';
import { MongoFarmProfileRepository } from '../src/services/farm/mongoFarmProfileRepository.js';
import { MongoHistoryRepository } from '../src/services/history/mongoHistoryRepository.js';
import { makeForecast } from '../tests/fakes/forecast.js';
import { bajraListingDraft } from '../tests/helpers.js';

/** Known answers, so the tests can look for them on screen (mirrored in frontend/e2e/fixtures.ts). */
const E2E_AI = {
  problem: 'पत्तों पर झुलसा रोग (E2E)',
  chatAnswer: 'शाम के समय छिड़काव करें। (E2E)',
};

const ai: AiProvider = {
  diagnose: async () => ({
    is_plant_image: true,
    confidence: 'high',
    severity: 'mild',
    problem_name: E2E_AI.problem,
    explanation: 'ज़्यादा नमी से फफूंद लग गई है।',
    desi_upay: ['नीम का घोल छिड़कें।'],
    dawai: [{ name: 'मैंकोजेब', kaise_use_karein: 'शाम को छिड़कें।' }],
    savdhani: ['छिड़काव करते समय दस्ताने पहनें।'],
  }),
  chat: async () => E2E_AI.chatAnswer,
  draftListing: async () => bajraListingDraft,
  estimatePrice: async () => ({ min_rupees: 180, max_rupees: 240, confidence: 'medium' }),
  classifyIntent: async () => ({ intent: null }),
};

const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
const uri = replSet.getUri('agriai_test_e2e');

// The real seed script fills the database (the same demo data as `npm run seed`). Asynchronous on purpose:
// the child talks to this tsx process, which must keep its event loop free (spawnSync deadlocks).
const seedExit = await new Promise<number | null>((resolve) => {
  const child = spawn(process.execPath, ['--import', 'tsx', 'src/scripts/seed.ts'], { env: { ...process.env, MONGO_URI: uri }, stdio: 'inherit' });
  child.on('exit', resolve);
});
if (seedExit !== 0) {
  await replSet.stop();
  process.exit(1);
}

mongoose.set('bufferCommands', false);
await mongoose.connect(uri);
await Promise.all(Object.values(mongoose.models).map((model) => model.init()));

// Pilot-only features are switched on for everyone (the delivery person and guests have no pilot account).
const defaults = flagDefaults(false);
const allOn = Object.fromEntries(FLAG_KEYS.map((key) => [key, FEATURE_FLAGS[key].default === 'pilot' ? 'all' : defaults[key]])) as Record<keyof typeof FEATURE_FLAGS, FlagState>;

const app = createApp({
  aiProvider: ai,
  historyRepository: new MongoHistoryRepository(),
  farmProfiles: new MongoFarmProfileRepository(),
  weather: { getForecast: async () => makeForecast() },
  corsOrigins: ['http://localhost:4173'],
  // Requests come through vite preview; each test phone sends its own X-Forwarded-For (frontend/e2e/fixtures.ts).
  trustProxyHops: 1,
  market: { config: { jwtSecret: 'e2e-secret-e2e-secret-e2e-secret-e2e!!', cookieSecure: false, commissionBps: 300 }, credentials: new PinCredentials(4) },
  flags: new FeatureFlags(allOn),
});

const server = app.listen(Number(process.env.PORT ?? 4000), () => console.log('E2E READY'));
const stop = async () => {
  server.close();
  await mongoose.disconnect();
  await replSet.stop();
  process.exit(0);
};
process.on('SIGTERM', () => void stop());
process.on('SIGINT', () => void stop());
