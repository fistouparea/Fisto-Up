import { FEATURE_FLAGS, FLAG_KEYS } from '../config/featureFlags.js';
import { UserModel } from '../modules/auth/user.model.js';
import { FeatureFlagModel } from '../modules/flags/flag.model.js';

/**
 * Demo databases only: the seeded demo accounts are not pilot accounts, so every "pilot" feature is switched on
 * for everyone, set by the demo coordinator (9000000001) as in #/admin/flags. Needs an open mongoose connection.
 */
export async function enablePilotFeaturesForDemo(): Promise<number> {
  const coordinator = await UserModel.findOne({ phone: '9000000001', role: 'coordinator' }, { _id: 1 }).lean().exec();
  if (!coordinator) throw new Error('Demo coordinator 9000000001 not found (seed incomplete?)');
  const keys = FLAG_KEYS.filter((key) => FEATURE_FLAGS[key].default === 'pilot');
  for (const key of keys) {
    await FeatureFlagModel.updateOne({ key }, { $set: { state: 'all', updatedBy: coordinator._id } }, { upsert: true }).exec();
  }
  return keys.length;
}
