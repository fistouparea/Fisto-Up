import { z } from 'zod';
import { LICENCE_NUMBER_PATTERN } from '../../config/inputRules.js';
import { BUYER_TYPES, SELLER_KINDS } from '../auth/auth.types.js';

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

export const licenceNumberSchema = z.string().trim().regex(LICENCE_NUMBER_PATTERN, 'licence number');

export const sellerProfileBodySchema = z
  .object({
    name: shortText(60).pipe(z.string().min(2)),
    village: shortText(60),
    shgName: shortText(80).optional(),
    upiId: upiIdSchema,
    pickup: placeSchema,
    /** Left out by older app versions: the seller keeps their kind. */
    kind: z.enum(SELLER_KINDS).optional(),
    licenceNumber: licenceNumberSchema.optional(),
  })
  .refine((body) => body.kind !== 'input_dealer' || body.licenceNumber !== undefined, { message: 'licence number needed', path: ['licenceNumber'] });
export type SellerProfileBody = z.infer<typeof sellerProfileBodySchema>;

export const buyerProfileBodySchema = z.object({
  name: shortText(60).pipe(z.string().min(2)),
  buyerType: z.enum(BUYER_TYPES),
  businessName: shortText(80).optional(),
  village: shortText(60).optional(),
  address: shortText(300).optional(),
});
export type BuyerProfileBody = z.infer<typeof buyerProfileBodySchema>;
