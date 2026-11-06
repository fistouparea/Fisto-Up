/**
 * Offline demo backend (npm run demo, or scripts/demo.sh): runs fully on the laptop without internet.
 * - a throwaway in-memory MongoDB replica set filled by the real seed script (fresh demo data on every start),
 * - every pilot feature on for the demo accounts,
 * - DEMO_MODE: saved real AI answers + one saved forecast (demo/recordings.json) instead of Gemini/Open-Meteo,
 * - then the normal backend (src/server.ts) on PORT 4000.
 * It never reads .env, never touches the MongoDB on this machine and refuses NODE_ENV=production.
 */
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { enablePilotFeaturesForDemo } from './demoFlags.js';
import { loadRecordings } from './recordings.js';

if (process.env.NODE_ENV === 'production') {
  console.error('npm run demo can never run with NODE_ENV=production.');
  process.exit(1);
}
const recordings = loadRecordings(); // fails early when demo/recordings.json is missing or invalid
console.log(`Recorded AI answers: ${recordings.diagnoses.length} photos, ${recordings.chats.length} answers (${recordings.model}, ${recordings.recordedAt.slice(0, 10)}).`);

const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
const uri = replSet.getUri('agriai_demo');

const seedExit = await new Promise<number | null>((resolve) => {
  const child = spawn(process.execPath, ['--import', 'tsx', 'src/scripts/seed.ts'], { env: { ...process.env, MONGO_URI: uri }, stdio: 'inherit' });
  child.on('exit', resolve);
});
if (seedExit !== 0) {
  await replSet.stop();
  process.exit(1);
}
await mongoose.connect(uri);
await enablePilotFeaturesForDemo();
await mongoose.disconnect();

Object.assign(process.env, {
  NODE_ENV: 'development',
  DEMO_MODE: 'true',
  MONGO_URI: uri,
  JWT_SECRET: randomBytes(32).toString('hex'),
  // Required by the settings check; never used (no AI calls in demo mode).
  GEMINI_API_KEY: 'demo-mode-recorded-answers',
  GEMINI_MODEL: recordings.model,
  CORS_ORIGIN: 'http://localhost:4173,http://localhost:5173',
  COOKIE_SECURE: 'false',
  STORAGE_PROVIDER: 'database',
  LOG_LEVEL: process.env.LOG_LEVEL ?? 'warn',
});
// No online services in the demo (an empty value counts as "not set").
Object.assign(process.env, { SENTRY_DSN: '', DATA_GOV_API_KEY: '', VAPID_PUBLIC_KEY: '', VAPID_PRIVATE_KEY: '', VAPID_SUBJECT: '', CLOUDINARY_URL: '' });

const stopDb = () => void replSet.stop();
process.on('exit', stopDb);
await import('../server.js');
console.log('DEMO READY – backend http://localhost:4000 (offline, recorded AI answers). Stop: Ctrl+C');
