import { isValidObjectId, Types } from 'mongoose';
import { AppError } from '../../errors/AppError.js';
import type { SellerStatus } from '../auth/auth.types.js';
import { UserModel, type UserDocument } from '../auth/user.model.js';
import { ListingModel } from '../listings/listing.model.js';
import type { BuyerProfileBody, SellerProfileBody } from './seller.types.js';

/**
 * Saves the seller's profile. Changing the UPI ID of a verified seller sends them back to "pending":
 * buyers pay to that ID, so a coordinator must check it again.
 */
export async function saveSellerProfile(userId: string, body: SellerProfileBody): Promise<UserDocument> {
  const user = await findUser(userId);
  if (user.role !== 'seller' || !user.seller) throw new AppError('FORBIDDEN');

  const upiChanged = user.seller.upiId !== undefined && user.seller.upiId !== body.upiId;
  const status: SellerStatus = user.seller.status === 'rejected' || upiChanged ? 'pending' : user.seller.status;

  user.name = body.name;
  user.seller.village = body.village;
  user.seller.shgName = body.shgName;
  user.seller.upiId = body.upiId;
  user.seller.pickup = body.pickup;
  user.seller.status = status;
  if (status === 'pending') user.seller.rejectReason = undefined;
  await user.save();

  // Listings keep a copy of the pickup place (for "पास में") and of whether the seller is verified.
  await ListingModel.updateMany(
    { sellerId: user._id },
    {
      $set: {
        sellerVerified: status === 'verified',
        location: { type: 'Point', coordinates: [body.pickup.lon, body.pickup.lat] },
        place: { district: body.pickup.district, tehsil: body.pickup.tehsil },
      },
    },
  ).exec();
  return user;
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

/** Coordinator decision. Rejected sellers can fix their profile, which sends it back to "pending". */
export async function setSellerStatus(
  sellerId: string,
  decision: { status: 'verified' | 'rejected'; reason?: string },
  coordinatorId: string,
): Promise<UserDocument> {
  const user = await findUser(sellerId);
  if (user.role !== 'seller' || !user.seller) throw new AppError('NOT_FOUND');

  user.seller.status = decision.status;
  user.seller.rejectReason = decision.status === 'rejected' ? decision.reason : undefined;
  if (decision.status === 'verified') {
    user.seller.verifiedAt = new Date();
    user.seller.verifiedBy = new Types.ObjectId(coordinatorId);
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
