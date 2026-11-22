import { SELLER_REVIEW_TEXTS as TEXTS } from '../../config/marketMessages.js';
import { logger } from '../../observability/logger.js';
import { UserModel, type UserDocument } from '../auth/user.model.js';
import type { ListingDocument } from '../listings/listing.model.js';
import { MarketNotificationModel } from '../notifications/notification.model.js';

/*
 * Nobody used to hear about the seller check: the coordinator not that a listing waits, the seller not the result.
 * Best effort: a failed notice never fails the listing or the decision.
 */

export async function notifyListingWaiting(listing: ListingDocument): Promise<void> {
  if (listing.sellerVerified) return;
  await bestEffort(async () => {
    const [seller, coordinators] = await Promise.all([
      UserModel.findById(listing.sellerId, { name: 1 }).lean().exec(),
      UserModel.find({ role: 'coordinator', deletedAt: { $exists: false } }, { _id: 1 }).lean().exec(),
    ]);
    const body = TEXTS.waitingBody(seller?.name ?? '', listing.title.hi);
    await MarketNotificationModel.insertMany(
      coordinators.map(({ _id }) => ({ userId: _id, kind: 'seller', title: TEXTS.waitingTitle, body, href: '#/admin/listings' })),
    );
  });
}

export async function notifySellerDecision(user: UserDocument): Promise<void> {
  await bestEffort(async () => {
    const verified = user.seller?.status === 'verified';
    await MarketNotificationModel.create({
      userId: user._id,
      kind: 'seller',
      title: verified ? TEXTS.verifiedTitle : TEXTS.rejectedTitle,
      body: verified ? TEXTS.verifiedBody : TEXTS.rejectedBody(user.seller?.rejectReason ?? ''),
      href: verified ? '#/sell' : '#/account',
    });
  });
}

async function bestEffort(write: () => Promise<void>): Promise<void> {
  try {
    await write();
  } catch (error) {
    logger.error({ err: error }, 'seller check notice not saved');
  }
}
