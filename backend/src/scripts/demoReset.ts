/**
 * Resets the DEMO database to clean demo data (for the 5-minute demo, launch-kit/5-demo):
 * drops the whole database, then runs the normal seed script (npm run seed) on it.
 *
 *   DEMO_MONGO_URI=mongodb://localhost:27017/agriai_demo npm run demo:reset
 *   (or MONGO_URI in .env pointing at an agriai_demo… database)
 *
 * The demo accounts are not pilot accounts, so every "pilot" feature is switched on for everyone in this demo
 * database (as the coordinator would do in #/admin/flags). Real databases are never touched.
 *
 * Refuses unless the database name starts with "agriai_demo" and NODE_ENV is not production (demoGuard.ts).
 * The seed needs a replica set (transactions), like the app's marketplace.
 */
import { spawn } from 'node:child_process';
import mongoose from 'mongoose';
import { FEATURE_FLAGS, FLAG_KEYS } from '../config/featureFlags.js';
import { UserModel } from '../modules/auth/user.model.js';
import { FeatureFlagModel } from '../modules/flags/flag.model.js';
import { databaseName, demoResetProblem } from './demoGuard.js';

const uri = process.env.DEMO_MONGO_URI?.trim() || process.env.MONGO_URI?.trim() || undefined;
const problem = demoResetProblem(uri, process.env.NODE_ENV);
if (problem || !uri) {
  console.error(`demo:reset ruka: ${problem ?? 'URI nahi'}`);
  process.exit(1);
}

mongoose.set('bufferCommands', false);
await mongoose.connect(uri, { serverSelectionTimeoutMS: 5_000 });
await mongoose.connection.dropDatabase();
await mongoose.disconnect();
console.log(`Database "${databaseName(uri) ?? ''}" khaali kiya. Ab demo data daal rahe hain…`);

// Asynchronous child (like backend/e2e/server.ts): the seed script with MONGO_URI set to the demo database.
const exit = await new Promise<number | null>((resolve) => {
  const child = spawn(process.execPath, ['--import', 'tsx', 'src/scripts/seed.ts'], { env: { ...process.env, MONGO_URI: uri }, stdio: 'inherit' });
  child.on('exit', resolve);
});
if (exit !== 0) {
  console.error('Seed fail hua – upar ka error dekhein.');
  process.exit(1);
}
// Pilot-only features on for everyone in the demo database, set by the demo coordinator (9000000001).
await mongoose.connect(uri, { serverSelectionTimeoutMS: 5_000 });
const coordinator = await UserModel.findOne({ phone: '9000000001', role: 'coordinator' }, { _id: 1 }).lean().exec();
if (!coordinator) {
  console.error('Demo coordinator nahi mila – seed adhoora?');
  process.exit(1);
}
const pilotFlags = FLAG_KEYS.filter((key) => FEATURE_FLAGS[key].default === 'pilot');
for (const key of pilotFlags) {
  await FeatureFlagModel.updateOne({ key }, { $set: { state: 'all', updatedBy: coordinator._id } }, { upsert: true }).exec();
}
await mongoose.disconnect();
console.log(`${pilotFlags.length} pilot suvidhaayein demo mein sabke liye chalu.`);
console.log('Demo taiyaar. Sab demo PIN 2580 (launch-kit/5-demo/demo-script.pdf).');
