/**
 * Checks that the app's frequent queries use an index (no full collection scan), against MONGO_URI.
 *   npm run check-indexes
 *   docker compose exec backend node dist/scripts/checkIndexes.js
 * Read-only: builds missing indexes the same way the app does at startup, then only runs explain().
 */
import mongoose from 'mongoose';
import { checkQueryPlans } from '../db/queryPlans.js';

const uri = process.env.MONGO_URI;
if (!uri) {
  console.error('MONGO_URI is not set.');
  process.exit(1);
}

await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
const results = await checkQueryPlans();
await mongoose.disconnect();

for (const { name, plan, fullScan } of results) {
  console.log(`${fullScan ? '✗ FULL SCAN' : '✓'}  ${name.padEnd(36)} ${plan}`);
}
const bad = results.filter((result) => result.fullScan);
console.log(bad.length === 0 ? '\nAll frequent queries use an index.' : `\n${bad.length} queries scan a whole collection: add an index.`);
process.exit(bad.length === 0 ? 0 : 1);
