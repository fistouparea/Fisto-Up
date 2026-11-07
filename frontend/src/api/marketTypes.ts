import type { DeliveryEvent } from './delivery';
import type { InputGenericId } from '../data/inputGenerics';
/** Marketplace types. Mirror backend/src/modules/** types; keep the two in sync. Money is integer paise. */

export type Role = 'seller' | 'buyer' | 'coordinator';
export type SellerStatus = 'pending' | 'verified' | 'rejected';
/** producer: farmer/SHG. input_dealer: licensed खाद-बीज-दवाई shop. */
export type SellerKind = 'producer' | 'input_dealer';
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
  kind: SellerKind;
  licenceNumber?: string;
  licenceVerified: boolean;
  village?: string;
  shgName?: string;
  upiId?: string;
  pickup?: Place;
  rejectReason?: string;
  profileComplete: boolean;
  /** Cash payment is switched off and there is no UPI ID: listings are hidden until one is added. */
  upiNeeded?: boolean;
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
  /** Left out: no UPI ID, paid in cash at delivery. */
  upiId?: string;
  pickup: Place;
  kind: SellerKind;
  licenceNumber?: string;
}

export interface BuyerProfileInput {
  name: string;
  buyerType: BuyerType;
  businessName?: string;
  village?: string;
  address?: string;
}

/** Mirrors backend/src/config/marketCatalog.ts. */
export const CATEGORIES = ['crop', 'shg', 'input'] as const;
export type Category = (typeof CATEGORIES)[number];

export const UNITS = ['quintal', 'kg', 'piece', 'pack', 'litre'] as const;
export type Unit = (typeof UNITS)[number];

export const PRODUCT_IDS = [
  'bajra',
  'guar',
  'moong',
  'moth',
  'chana',
  'sarson',
  'jeera',
  'gehun',
  'til',
  'other_crop',
  'achar',
  'papad',
  'masala',
  'ker_sangri',
  'handicraft',
  'other_shg',
  'fungicide',
  'insecticide',
  'fertilizer',
  'seed',
  'bio_input',
  'other_input',
] as const;
export type ProductId = (typeof PRODUCT_IDS)[number];

export type ListingStatus = 'active' | 'paused' | 'sold_out';

export interface Bilingual {
  hi: string;
  en: string;
}

export interface ListingDraft {
  category: Category;
  product: ProductId;
  quantity: number | null;
  unit: Unit | null;
  pricePerUnitPaise: number | null;
  qualityNotes: string;
  title: Bilingual;
  description: Bilingual;
}

export type DraftResponse =
  | { status: 'ok'; photoId: string; draft: ListingDraft }
  /** Photo did not seem to match; `draft` still has what the seller said. */
  | { status: 'retake'; reason: string; draft?: ListingDraft };

export interface NewListing {
  category: Category;
  product: ProductId;
  title: Bilingual;
  description: Bilingual;
  qualityNotes: string;
  unit: Unit;
  quantity: number;
  pricePerUnitPaise: number;
  minOrderQty: number;
  photoIds: string[];
  fssaiNumber?: string;
  genericId?: InputGenericId;
}

export interface ListingChange {
  pricePerUnitPaise?: number;
  quantityAvailable?: number;
  minOrderQty?: number;
  status?: ListingStatus;
}

/** A listing as its seller sees it on "मेरी बिक्री". */
export interface SellerListing {
  id: string;
  category: Category;
  product: ProductId;
  title: Bilingual;
  description: Bilingual;
  qualityNotes: string;
  unit: Unit;
  pricePerUnitPaise: number;
  quantityAvailable: number;
  minOrderQty: number;
  photoUrls: string[];
  fssaiNumber?: string;
  genericId?: InputGenericId;
  status: ListingStatus;
  hidden: boolean;
  visible: boolean;
  createdAt: string;
}

interface FairRange {
  unit: Unit;
  fairMinPaise: number;
  fairMaxPaise: number;
}

/** Fair price suggestion for the listing form. `source: null` = no data, hide it. */
export type PriceSuggestion =
  | (FairRange & {
      source: 'mandi';
      mandiMinPaisePerQuintal: number;
      mandiMaxPaisePerQuintal: number;
      date: string;
      markets: string[];
    })
  | (FairRange & { source: 'platform'; sampleSize: number })
  | (FairRange & { source: 'ai' })
  | { source: null };

export interface PublicSeller {
  id: string;
  name: string;
  village: string;
  shgName?: string;
  verified: boolean;
  /** No UPI ID: buyers pay in cash at delivery. */
  cashOnly?: boolean;
  rating: { average: number | null; count: number };
}

/** What buyers see. Never contains the seller's phone or UPI ID. */
export interface PublicListing {
  id: string;
  category: Category;
  product: ProductId;
  title: Bilingual;
  description: Bilingual;
  qualityNotes: string;
  unit: Unit;
  pricePerUnitPaise: number;
  quantityAvailable: number;
  minOrderQty: number;
  photoUrls: string[];
  fssaiNumber?: string;
  genericId?: InputGenericId;
  seller: PublicSeller;
  /** A licensed input dealer's product: shown as "साझेदार दुकान". */
  partner: boolean;
  place: { district?: string; tehsil?: string };
  distanceKm?: number;
  createdAt: string;
}

export type SortOrder = 'newest' | 'price_asc' | 'price_desc';

export interface SearchFilters {
  category?: Category;
  product?: ProductId;
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  minQty?: number;
  bulk?: boolean;
  near?: { lat: number; lon: number; label: string; radiusKm?: number };
  sort: SortOrder;
}

export interface SearchPage {
  items: PublicListing[];
  page: number;
  hasMore: boolean;
}

/** Mirrors backend/src/modules/orders/orderStateMachine.ts. The server decides which steps are allowed. */
export type OrderStatus =
  | 'requested'
  | 'accepted'
  | 'rejected'
  | 'ready'
  | 'out_for_delivery'
  | 'ready_for_pickup'
  | 'delivered'
  | 'paid'
  | 'completed'
  | 'cancelled';
export type Fulfilment = 'delivery' | 'pickup';
export type PaymentMethod = 'upi' | 'cash';
export const FINISHED_ORDER_STATUSES: readonly OrderStatus[] = ['rejected', 'completed', 'cancelled'];

export interface NewOrder {
  listingId: string;
  quantity: number;
  fulfilment: Fulfilment;
  deliveryAddress?: string;
  paymentMethod: PaymentMethod;
  offeredPricePerUnitPaise?: number;
  note?: string;
  /** Came from the "ज़रूरी सामान" kit after a diagnosis (farm inputs only). */
  referral?: 'ai_kit';
}

export interface Order {
  id: string;
  ref: string;
  status: OrderStatus;
  item: { listingId: string; product: ProductId; title: Bilingual; unit: Unit; photoUrl?: string };
  quantity: number;
  listedPricePerUnitPaise: number;
  pricePerUnitPaise: number;
  totalPaise: number;
  isPriceRequest: boolean;
  fulfilment: Fulfilment;
  deliveryAddress?: string;
  paymentMethod: PaymentMethod;
  paidVia?: PaymentMethod;
  note?: string;
  buyer: { name: string; village?: string };
  seller: { name: string; village?: string };
  history: { status: OrderStatus; at: string; byRole: Role }[];
  deliveryPerson?: { name: string; phone: string };
  /** What the delivery person reported (separate from the status). */
  deliveryEvents: DeliveryEvent[];
  deliveryLinkActive?: boolean;
  rating?: { stars: number; comment?: string };
  commissionPaise?: number;
  createdAt: string;
  updatedAt: string;
  viewerRole: 'buyer' | 'seller' | 'coordinator';
  allowedNext: OrderStatus[];
  contact?: { sellerPhone?: string; buyerPhone?: string; pickup?: Place };
  /** UPI fields only when the seller has a UPI ID. */
  payment?: { upiLink?: string; upiId?: string; payeeName: string; amountPaise: number };
  canRate: boolean;
}

export type ReportReason = 'quality' | 'not_delivered' | 'payment' | 'wrong_item' | 'fake_listing' | 'behaviour' | 'other';

export interface MarketNotification {
  id: string;
  kind: string;
  title: string;
  body: string;
  href: string;
  read: boolean;
  orderId?: string;
  createdAt: string;
}
