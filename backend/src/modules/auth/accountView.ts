import type { AccountView, AuthUser, Place, SellerProfileView } from './auth.types.js';
import type { UserDocument } from './user.model.js';

type SellerData = NonNullable<UserDocument['seller']>;

export function toAuthUser(user: UserDocument): AuthUser {
  return {
    id: user._id.toString(),
    role: user.role,
    name: user.name,
    ...(user.seller && { sellerStatus: user.seller.status }),
    ...(user.pilot && { pilot: true }),
  };
}

/** The account as its owner sees it. */
export function toAccountView(user: UserDocument): AccountView {
  return {
    id: user._id.toString(),
    phone: user.phone,
    role: user.role,
    name: user.name,
    ...(user.deviceId && { deviceId: user.deviceId }),
    ...(user.seller && { seller: toSellerProfileView(user.seller) }),
    ...(user.buyer && {
      buyer: {
        buyerType: user.buyer.buyerType,
        ...(user.buyer.businessName && { businessName: user.buyer.businessName }),
        ...(user.buyer.village && { village: user.buyer.village }),
        ...(user.buyer.address && { address: user.buyer.address }),
      },
    }),
  };
}

export function toSellerProfileView(seller: SellerData): SellerProfileView {
  return {
    status: seller.status,
    kind: seller.kind ?? 'producer',
    ...(seller.licenceNumber && { licenceNumber: seller.licenceNumber }),
    licenceVerified: isLicenceVerified(seller),
    ...(seller.village && { village: seller.village }),
    ...(seller.shgName && { shgName: seller.shgName }),
    ...(seller.upiId && { upiId: seller.upiId }),
    ...(seller.pickup && { pickup: toPlace(seller.pickup) }),
    ...(seller.rejectReason && { rejectReason: seller.rejectReason }),
    profileComplete: isSellerProfileComplete(seller),
    rating: sellerRating(seller),
  };
}

export function isSellerProfileComplete(seller: SellerData | null | undefined): boolean {
  const licenceOk = seller?.kind !== 'input_dealer' || Boolean(seller.licenceNumber);
  return Boolean(seller?.village && seller.upiId && seller.pickup && licenceOk);
}

/** An input dealer whose licence a coordinator checked (and who is still verified). */
export function isLicenceVerified(seller: SellerData | null | undefined): boolean {
  return seller?.kind === 'input_dealer' && seller.status === 'verified' && Boolean(seller.licenceNumber && seller.licenceVerifiedAt);
}

export function sellerRating(seller: Pick<SellerData, 'ratingSum' | 'ratingCount'>): { average: number | null; count: number } {
  const count = seller.ratingCount ?? 0;
  return { average: count > 0 ? Math.round(((seller.ratingSum ?? 0) / count) * 10) / 10 : null, count };
}

export function toPlace(place: NonNullable<SellerData['pickup']>): Place {
  return {
    lat: place.lat,
    lon: place.lon,
    ...(place.district && { district: place.district }),
    ...(place.tehsil && { tehsil: place.tehsil }),
    ...(place.address && { address: place.address }),
  };
}
