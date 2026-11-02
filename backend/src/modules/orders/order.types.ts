import type { DeliveryEventView } from '../delivery/delivery.service.js';
import { z } from 'zod';
import type { ProductId, Unit } from '../../config/marketCatalog.js';
import { LISTING_RULES, ORDER_RULES } from '../../config/marketRules.js';
import type { Place, Role } from '../auth/auth.types.js';
import { objectIdSchema } from '../listings/listing.types.js';
import { REFERRALS, type Referral } from '../../config/inputRules.js';
import { personNameSchema, phoneSchema } from '../auth/auth.types.js';
import { PAYMENT_METHODS, type PaymentMethod } from './order.model.js';
import { FULFILMENTS, ORDER_STATUSES, type Fulfilment, type OrderStatus } from './orderStateMachine.js';

export const createOrderBodySchema = z
  .object({
    listingId: objectIdSchema,
    quantity: z.number().int().min(1).max(LISTING_RULES.maxQuantity),
    fulfilment: z.enum(FULFILMENTS),
    deliveryAddress: z.string().trim().min(5).max(ORDER_RULES.maxAddressLength).optional(),
    paymentMethod: z.enum(PAYMENT_METHODS),
    /** Price request (B2B counter-offer), integer paise per unit. */
    offeredPricePerUnitPaise: z.number().int().min(100).max(LISTING_RULES.maxPricePerUnitPaise).optional(),
    note: z.string().trim().max(ORDER_RULES.maxNoteLength).optional(),
    /** "ज़रूरी सामान": the farmer came from the kit after a diagnosis (only for खाद-बीज-दवाई). */
    referral: z.enum(REFERRALS).optional(),
  })
  .refine((body) => body.fulfilment === 'pickup' || body.deliveryAddress, 'Delivery needs an address');
export type CreateOrderBody = z.infer<typeof createOrderBodySchema>;

export const transitionBodySchema = z.object({
  to: z.enum(ORDER_STATUSES),
  /** With "paid": how the money came. Defaults to the buyer's chosen method. */
  paidVia: z.enum(PAYMENT_METHODS).optional(),
});

export const ratingBodySchema = z.object({
  stars: z.number().int().min(1).max(5),
  comment: z.string().trim().max(ORDER_RULES.ratingCommentMax).optional(),
});

export const deliveryPersonBodySchema = z.object({ name: personNameSchema, phone: phoneSchema });

export const orderListQuerySchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  page: z.coerce.number().int().min(1).max(500).default(1),
});

export interface OrderContact {
  /** Shared only after the seller accepted. */
  sellerPhone?: string;
  buyerPhone?: string;
  pickup?: Place;
}

export interface OrderPayment {
  upiLink: string;
  upiId: string;
  payeeName: string;
  amountPaise: number;
}

export interface OrderView {
  id: string;
  ref: string;
  status: OrderStatus;
  item: { listingId: string; product: ProductId; title: { hi: string; en: string }; unit: Unit; photoUrl?: string };
  quantity: number;
  listedPricePerUnitPaise: number;
  pricePerUnitPaise: number;
  totalPaise: number;
  referral?: Referral;
  /** What the delivery person reported, with photo proof links (private photos). */
  deliveryEvents: DeliveryEventView[];
  /** Coordinators: a delivery link is working right now. */
  deliveryLinkActive?: boolean;
  isPriceRequest: boolean;
  fulfilment: Fulfilment;
  deliveryAddress?: string;
  paymentMethod: PaymentMethod;
  paidVia?: PaymentMethod;
  note?: string;
  buyer: { name: string; village?: string };
  seller: { name: string; village?: string };
  history: { status: OrderStatus; at: Date; byRole: Role }[];
  deliveryPerson?: { name: string; phone: string };
  rating?: { stars: number; comment?: string };
  commissionPaise?: number;
  createdAt: Date;
  updatedAt: Date;
  /** How the viewer is involved, and the steps they may take now (buttons). */
  viewerRole: 'buyer' | 'seller' | 'coordinator';
  allowedNext: OrderStatus[];
  contact?: OrderContact;
  /** Buyer only, from acceptance until the money is confirmed. */
  payment?: OrderPayment;
  canRate: boolean;
}
