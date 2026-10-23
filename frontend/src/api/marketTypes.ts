/** Marketplace types. Mirror backend/src/modules/** types; keep the two in sync. Money is integer paise. */

export type Role = 'seller' | 'buyer' | 'coordinator';
export type SellerStatus = 'pending' | 'verified' | 'rejected';
export type BuyerType = 'household' | 'business';

export interface Place {
  district?: string;
  tehsil?: string;
  address?: string;
  lat: number;
  lon: number;
}

export interface SellerProfile {
  status: SellerStatus;
  village?: string;
  shgName?: string;
  upiId?: string;
  pickup?: Place;
  rejectReason?: string;
  profileComplete: boolean;
  rating: { average: number | null; count: number };
}

export interface BuyerProfile {
  buyerType: BuyerType;
  businessName?: string;
  village?: string;
  address?: string;
}

/** The logged-in user's own account. */
export interface Account {
  id: string;
  phone: string;
  role: Role;
  name: string;
  deviceId?: string;
  seller?: SellerProfile;
  buyer?: BuyerProfile;
}

export interface SellerProfileInput {
  name: string;
  village: string;
  shgName?: string;
  upiId: string;
  pickup: Place;
}

export interface BuyerProfileInput {
  name: string;
  buyerType: BuyerType;
  businessName?: string;
  village?: string;
  address?: string;
}
