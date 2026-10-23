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

/** Mirrors backend/src/config/marketCatalog.ts. */
export const CATEGORIES = ['crop', 'shg'] as const;
export type Category = (typeof CATEGORIES)[number];

export const UNITS = ['quintal', 'kg', 'piece', 'pack'] as const;
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

export type DraftResponse = { status: 'ok'; photoId: string; draft: ListingDraft } | { status: 'retake'; reason: string };

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
