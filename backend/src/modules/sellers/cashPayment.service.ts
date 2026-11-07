import mongoose, { type ClientSession } from 'mongoose';
import type { FlagState } from '../../config/featureFlags.js';
import { UserModel } from '../auth/user.model.js';
import type { FeatureFlags } from '../flags/flag.service.js';
import { ListingModel } from '../listings/listing.model.js';

/** Sellers without a UPI ID (field missing or empty): they are paid in cash at delivery. */
export const NO_UPI_FILTER = { role: 'seller', 'seller.upiId': { $in: [null, ''] } } as const;

/**
 * Switches cash payment (flag cashPayment) on or off. In the same transaction the listings of sellers without a
 * UPI ID are hidden (off: buyers could not pay them) or shown again (on). Returns how many listings changed.
 */
export async function setCashPayment(flags: FeatureFlags, state: FlagState, coordinatorId: string): Promise<{ listingsChanged: number }> {
  const on = state !== 'off';
  const listingsChanged = await mongoose.connection.transaction(async (session) => {
    await flags.set('cashPayment', state, coordinatorId, session);
    return syncNoUpiListings(on, session);
  });
  // A read during the transaction may have cached the old state.
  flags.clearCache();
  return { listingsChanged };
}

async function syncNoUpiListings(cashOn: boolean, session: ClientSession): Promise<number> {
  if (cashOn) {
    const shown = await ListingModel.updateMany({ paymentBlocked: true }, { $set: { paymentBlocked: false } }, { session }).exec();
    return shown.modifiedCount;
  }
  const sellers = await UserModel.find(NO_UPI_FILTER, { _id: 1 }).session(session).lean().exec();
  if (sellers.length === 0) return 0;
  const hidden = await ListingModel.updateMany(
    { sellerId: { $in: sellers.map((seller) => seller._id) }, paymentBlocked: { $ne: true } },
    { $set: { paymentBlocked: true } },
    { session },
  ).exec();
  return hidden.modifiedCount;
}
