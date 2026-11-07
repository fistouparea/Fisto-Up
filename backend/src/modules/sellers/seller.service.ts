import { isValidObjectId, Types } from 'mongoose';
import { AppError } from '../../errors/AppError.js';
import type { SellerStatus } from '../auth/auth.types.js';
import { UserModel, type UserDocument } from '../auth/user.model.js';
import { ListingModel } from '../listings/listing.model.js';
import type { BuyerProfileBody, SellerProfileBody } from './seller.types.js';

export interface SaveSellerOptions {
  /** The cashPayment flag: while it is off, a UPI ID is required. */
  cashOn: boolean;
  /** A coordinator entered the UPI ID (they met the seller), so it needs no second check. */
  upiCheckedByCoordinator?: boolean;
}

/**
 * Saves the seller's profile. A new UPI ID (also the first one, added later from "मेरा खाता") sends a verified
 * seller back to "pending": buyers pay to that ID, so a coordinator must check it. Removing the UPI ID needs no
 * check (the seller is then paid in cash). The same for becoming (or leaving) an input dealer and for a new licence
 * number: the coordinator checks the licence before the dealer can list.
 */
export async function saveSellerProfile(userId: string, body: SellerProfileBody, options: SaveSellerOptions): Promise<UserDocument> {
  const user = await findUser(userId);
  if (user.role !== 'seller' || !user.seller) throw new AppError('FORBIDDEN');
  if (!options.cashOn && !body.upiId) throw new AppError('UPI_REQUIRED');

  const upiChanged = body.upiId !== undefined && user.seller.upiId !== body.upiId && !options.upiCheckedByCoordinator;
  const kind = body.kind ?? user.seller.kind ?? 'producer';
  const licenceNumber = kind === 'input_dealer' ? (body.licenceNumber ?? user.seller.licenceNumber) : undefined;
  if (kind === 'input_dealer' && !licenceNumber) throw new AppError('INVALID_INPUT', 'Licence number needed');
  const kindChanged = kind !== (user.seller.kind ?? 'producer');
  const licenceChanged = licenceNumber !== user.seller.licenceNumber;
  const recheck = upiChanged || kindChanged || licenceChanged;
  const status: SellerStatus = user.seller.status === 'rejected' || recheck ? 'pending' : user.seller.status;

  user.name = body.name;
  user.seller.village = body.village;
  user.seller.shgName = body.shgName;
  user.seller.upiId = body.upiId;
  user.seller.pickup = body.pickup;
  user.seller.kind = kind;
  user.seller.licenceNumber = licenceNumber;
  if (kindChanged || licenceChanged) {
    user.seller.licenceVerifiedAt = undefined;
    user.seller.licenceVerifiedBy = undefined;
  }
  user.seller.status = status;
  if (status === 'pending') user.seller.rejectReason = undefined;
  await user.save();

  // Listings keep a copy of the pickup place (for "पास में") and of whether the seller is verified.
  await ListingModel.updateMany(
    { sellerId: user._id },
    {
      $set: {
        sellerVerified: status === 'verified',
        paymentBlocked: !options.cashOn && !body.upiId,
        location: { type: 'Point', coordinates: [body.pickup.lon, body.pickup.lat] },
        place: { district: body.pickup.district, tehsil: body.pickup.tehsil },
      },
    },
  ).exec();
  return user;
}

/**
 * A coordinator adds (or corrects) a seller's UPI ID from the admin panel, e.g. for a seller who cannot use the
 * app. The coordinator checked it with the seller, so the seller's status stays. Their listings can be paid again.
 */
export async function setSellerUpi(sellerId: string, upiId: string): Promise<{ user: UserDocument; hadUpi: boolean }> {
  const user = await findUser(sellerId);
  if (user.role !== 'seller' || !user.seller) throw new AppError('NOT_FOUND');
  const hadUpi = Boolean(user.seller.upiId);
  user.seller.upiId = upiId;
  await user.save();
  await ListingModel.updateMany({ sellerId: user._id, paymentBlocked: true }, { $set: { paymentBlocked: false } }).exec();
  return { user, hadUpi };
}

export async function saveBuyerProfile(userId: string, body: BuyerProfileBody): Promise<UserDocument> {
  const user = await findUser(userId);
  if (user.role !== 'buyer') throw new AppError('FORBIDDEN');
  user.name = body.name;
  user.buyer = {
    buyerType: body.buyerType,
    businessName: body.businessName,
    village: body.village,
    address: body.address,
  };
  await user.save();
  return user;
}

/**
 * Coordinator decision. Rejected sellers can fix their profile, which sends it back to "pending".
 * An input dealer is verified only together with the licence check (`licenceChecked`).
 */
export async function setSellerStatus(
  sellerId: string,
  decision: { status: 'verified' | 'rejected'; reason?: string; licenceChecked?: boolean },
  coordinatorId: string,
): Promise<UserDocument> {
  const user = await findUser(sellerId);
  if (user.role !== 'seller' || !user.seller) throw new AppError('NOT_FOUND');
  const dealer = user.seller.kind === 'input_dealer';
  if (decision.status === 'verified' && dealer && (!decision.licenceChecked || !user.seller.licenceNumber)) {
    throw new AppError('LICENCE_CHECK_REQUIRED');
  }

  user.seller.status = decision.status;
  user.seller.rejectReason = decision.status === 'rejected' ? decision.reason : undefined;
  if (decision.status === 'verified') {
    user.seller.verifiedAt = new Date();
    user.seller.verifiedBy = new Types.ObjectId(coordinatorId);
    if (dealer) {
      user.seller.licenceVerifiedAt = user.seller.verifiedAt;
      user.seller.licenceVerifiedBy = user.seller.verifiedBy;
    }
  }
  await user.save();
  await ListingModel.updateMany({ sellerId: user._id }, { $set: { sellerVerified: decision.status === 'verified' } }).exec();
  return user;
}

async function findUser(userId: string): Promise<UserDocument> {
  const user = isValidObjectId(userId) ? await UserModel.findById(userId).exec() : null;
  if (!user) throw new AppError('NOT_FOUND');
  return user;
}
