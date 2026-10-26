/**
 * The one "Services" engine (modules/services) serves several kinds of bookable listings. What differs per kind
 * lives here: its types, price units, who may post it, whether a coordinator must approve it first and whether
 * bookings take dates from an availability calendar. Names are in Hindi for notifications; the app mirrors the
 * ids in frontend/src/data/serviceKinds.ts.
 */
import type { FlagKey } from './featureFlags.js';

export const SERVICE_KINDS = ['equipment', 'labour', 'livestock'] as const;
export type ServiceKind = (typeof SERVICE_KINDS)[number];

/** offer: "I have / I can" (machine, worker, animal). need: "I need" (a farmer's work need, labour only). */
export const SERVICE_SIDES = ['offer', 'need'] as const;
export type ServiceSide = (typeof SERVICE_SIDES)[number];

export const PRICE_UNITS = ['hour', 'day', 'bigha', 'animal'] as const;
export type PriceUnit = (typeof PRICE_UNITS)[number];

export const PRICE_UNIT_NAMES: Record<PriceUnit, string> = { hour: 'घंटा', day: 'दिन', bigha: 'बीघा', animal: 'पशु' };

export const EQUIPMENT_TYPES = {
  tractor: 'ट्रैक्टर',
  thresher: 'थ्रेशर',
  rotavator: 'रोटावेटर',
  sprayer: 'स्प्रेयर (छिड़काव मशीन)',
  seed_drill: 'सीड ड्रिल (बुवाई मशीन)',
  harvester: 'हार्वेस्टर',
  trolley: 'ट्रॉली',
  cultivator: 'कल्टीवेटर',
  other: 'दूसरी मशीन',
} as const;

export const LABOUR_SKILLS = {
  buvai: 'बुवाई',
  katai: 'कटाई',
  nirai: 'निराई-गुड़ाई',
  sinchai: 'सिंचाई',
  chhidkav: 'छिड़काव',
  thresher_kaam: 'थ्रेशर पर काम',
  pashu_seva: 'पशु सेवा',
  tractor_driver: 'ट्रैक्टर चलाना',
  other: 'दूसरा काम',
} as const;

export const LIVESTOCK_ANIMALS = {
  cow: 'गाय',
  buffalo: 'भैंस',
  goat: 'बकरी',
  sheep: 'भेड़',
  camel: 'ऊँट',
} as const;

export const LIVESTOCK_PURPOSES = ['dairy', 'farming', 'breeding'] as const;

interface KindRules {
  /** Hindi name for notifications. */
  hi: string;
  /** Feature flag that switches this kind on. */
  flag: FlagKey;
  types: Readonly<Record<string, string>>;
  sides: readonly ServiceSide[];
  priceUnits: readonly PriceUnit[];
  /** A coordinator approves every listing before it is public. */
  needsApproval: boolean;
  /** Bookings pick dates from the listing's availability calendar (double booking is impossible). */
  bookedByDate: boolean;
  maxPhotos: number;
}

export const SERVICE_KIND_RULES: Record<ServiceKind, KindRules> = {
  equipment: {
    hi: 'मशीन',
    flag: 'equipment',
    types: EQUIPMENT_TYPES,
    sides: ['offer'],
    priceUnits: ['hour', 'day', 'bigha'],
    needsApproval: false,
    bookedByDate: true,
    maxPhotos: 3,
  },
  labour: {
    hi: 'मज़दूर',
    flag: 'labour',
    types: LABOUR_SKILLS,
    sides: ['offer', 'need'],
    priceUnits: ['day'],
    needsApproval: false,
    bookedByDate: true,
    maxPhotos: 1,
  },
  livestock: {
    hi: 'पशु',
    flag: 'livestock',
    types: LIVESTOCK_ANIMALS,
    sides: ['offer'],
    priceUnits: ['animal'],
    needsApproval: true,
    bookedByDate: false,
    maxPhotos: 4,
  },
};

export const SERVICE_RULES = {
  /** Availability: dates from today up to this many days ahead. */
  maxDaysAhead: 90,
  maxDatesPerListing: 90,
  maxDatesPerBooking: 30,
  /** ₹1 lakh per hour/day/bigha is far above any real price; livestock up to ₹5 lakh per animal. */
  maxPricePaise: 5_00_000_00,
  searchRadiusKm: { default: 30, max: 200 },
  pageSize: 20,
  /** Per account: stops one account from flooding owners with requests. */
  bookingRateLimit: { windowMs: 60 * 60_000, limit: 30 },
  listingRateLimit: { windowMs: 60 * 60_000, limit: 20 },
  maxNoteLength: 300,
} as const;
