import { z } from 'zod';
import { AUTH_RULES } from '../../config/marketRules.js';
import { deviceIdSchema } from '../../types/history.js';

export const ROLES = ['seller', 'buyer', 'coordinator'] as const;
export type Role = (typeof ROLES)[number];

/** Only sellers and buyers can sign up in the app. Coordinators are created with `npm run create-coordinator`. */
export const SELF_SIGNUP_ROLES = ['seller', 'buyer'] as const;

export const SELLER_STATUSES = ['pending', 'verified', 'rejected'] as const;
export type SellerStatus = (typeof SELLER_STATUSES)[number];

/** producer: farmer or SHG selling produce. input_dealer: licensed खाद-बीज-दवाई shop (Phase 5). */
export const SELLER_KINDS = ['producer', 'input_dealer'] as const;
export type SellerKind = (typeof SELLER_KINDS)[number];

export const BUYER_TYPES = ['household', 'business'] as const;
export type BuyerType = (typeof BUYER_TYPES)[number];

/** Accepts "98765 43210", "+91-9876543210", "09876543210" and returns the 10 digits. */
export const phoneSchema = z
  .string()
  .max(20)
  .transform((value) => value.replace(/[\s-]/g, '').replace(/^(\+91|91(?=\d{10}$)|0(?=\d{10}$))/, ''))
  .pipe(z.string().regex(/^[6-9]\d{9}$/, 'Indian mobile number'));

export const pinSchema = z.string().regex(new RegExp(`^\\d{${AUTH_RULES.pinLength}}$`));

export const personNameSchema = z.string().trim().min(2).max(60);

export const registerBodySchema = z.object({
  phone: phoneSchema,
  pin: pinSchema,
  name: personNameSchema,
  role: z.enum(SELF_SIGNUP_ROLES),
  buyerType: z.enum(BUYER_TYPES).optional(),
  deviceId: deviceIdSchema.optional(),
  /** Pilot invite code; required while the inviteOnly flag is on. Checked in detail by the invite service. */
  inviteCode: z.string().trim().max(20).optional(),
});
export type RegisterBody = z.infer<typeof registerBodySchema>;

export const loginBodySchema = z.object({
  phone: phoneSchema,
  pin: pinSchema,
  deviceId: deviceIdSchema.optional(),
});
export type LoginBody = z.infer<typeof loginBodySchema>;

/** Who is calling, attached to the request by the auth middleware. */
export interface AuthUser {
  id: string;
  role: Role;
  name: string;
  sellerStatus?: SellerStatus;
  /** Pilot account (feature flags in state "pilot" apply). */
  pilot?: boolean;
}

export interface Place {
  district?: string;
  tehsil?: string;
  address?: string;
  lat: number;
  lon: number;
}

export interface SellerProfileView {
  status: SellerStatus;
  kind: SellerKind;
  /** Input dealers: their agri-input licence number and whether a coordinator checked it. */
  licenceNumber?: string;
  licenceVerified: boolean;
  village?: string;
  shgName?: string;
  upiId?: string;
  pickup?: Place;
  rejectReason?: string;
  /** Name, village, UPI ID and pickup place (and a licence number for input dealers) are filled. */
  profileComplete: boolean;
  rating: { average: number | null; count: number };
}

export interface BuyerProfileView {
  buyerType: BuyerType;
  businessName?: string;
  village?: string;
  address?: string;
}

/** The logged-in user's own account (GET /api/auth/me). Includes their phone; never sent to others. */
export interface AccountView {
  id: string;
  phone: string;
  role: Role;
  name: string;
  deviceId?: string;
  seller?: SellerProfileView;
  buyer?: BuyerProfileView;
}
