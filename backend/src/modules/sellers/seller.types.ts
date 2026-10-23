import { z } from 'zod';
import { BUYER_TYPES } from '../auth/auth.types.js';

const shortText = (max: number) => z.string().trim().min(1).max(max);

/** e.g. "ramesh@upi", "9876543210@ybl". */
export const upiIdSchema = z
  .string()
  .trim()
  .regex(/^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9]{1,63}$/, 'UPI ID like name@bank');

/** Rajasthan and around: rejects obviously wrong coordinates. */
export const placeSchema = z.object({
  district: shortText(60).optional(),
  tehsil: shortText(60).optional(),
  address: shortText(200).optional(),
  lat: z.number().min(6).max(37),
  lon: z.number().min(68).max(98),
});

export const sellerProfileBodySchema = z.object({
  name: shortText(60).pipe(z.string().min(2)),
  village: shortText(60),
  shgName: shortText(80).optional(),
  upiId: upiIdSchema,
  pickup: placeSchema,
});
export type SellerProfileBody = z.infer<typeof sellerProfileBodySchema>;

export const buyerProfileBodySchema = z.object({
  name: shortText(60).pipe(z.string().min(2)),
  buyerType: z.enum(BUYER_TYPES),
  businessName: shortText(80).optional(),
  village: shortText(60).optional(),
  address: shortText(300).optional(),
});
export type BuyerProfileBody = z.infer<typeof buyerProfileBodySchema>;
