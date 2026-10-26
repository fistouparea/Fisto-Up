import { z } from 'zod';
import {
  EQUIPMENT_TYPES,
  LABOUR_SKILLS,
  LIVESTOCK_ANIMALS,
  LIVESTOCK_PURPOSES,
  PRICE_UNITS,
  SERVICE_KINDS,
  SERVICE_RULES,
  SERVICE_SIDES,
  type PriceUnit,
  type ServiceKind,
  type ServiceSide,
} from '../../config/serviceKinds.js';
import { objectIdSchema } from '../listings/listing.types.js';
import { placeSchema } from '../sellers/seller.types.js';
import type { BookingActor, BookingStatus } from './bookingStateMachine.js';
import type { ServiceStatus } from './service.model.js';

const keys = <T extends Record<string, string>>(record: T) => Object.keys(record) as [keyof T & string, ...(keyof T & string)[]];
const text = (max: number) => z.string().trim().max(max);

export const isoDateSchema = z.iso.date();
const datesSchema = z
  .array(isoDateSchema)
  .max(SERVICE_RULES.maxDatesPerListing)
  .transform((dates) => [...new Set(dates)].sort());

const common = {
  title: text(100).min(2),
  description: text(500).default(''),
  photoIds: z.array(objectIdSchema).max(4).default([]),
  village: text(60).min(1),
  place: placeSchema,
  pricePaise: z.number().int().min(0).max(SERVICE_RULES.maxPricePaise),
  priceUnit: z.enum(PRICE_UNITS),
  availableDates: datesSchema.default([]),
};

const equipmentSchema = z.object({
  ...common,
  kind: z.literal('equipment'),
  side: z.literal('offer').default('offer'),
  typeId: z.enum(keys(EQUIPMENT_TYPES)),
  details: z.object({ withOperator: z.boolean().default(true), horsePower: z.number().int().min(1).max(500).optional() }).default({ withOperator: true }),
});

const labourSchema = z
  .object({
    ...common,
    kind: z.literal('labour'),
    side: z.enum(SERVICE_SIDES),
    skills: z.array(z.enum(keys(LABOUR_SKILLS))).min(1).max(6),
    details: z
      .object({
        /** A worker confirms being at least 18 years old (offers only). */
        ageConfirmed18: z.boolean().optional(),
        /** A farmer's work need: how many workers. */
        workersNeeded: z.number().int().min(1).max(50).optional(),
      })
      .default({}),
  })
  .refine((body) => body.side === 'need' || body.details.ageConfirmed18 === true, { message: 'Worker must confirm 18+', path: ['details', 'ageConfirmed18'] });

const livestockSchema = z.object({
  ...common,
  kind: z.literal('livestock'),
  side: z.literal('offer').default('offer'),
  typeId: z.enum(keys(LIVESTOCK_ANIMALS)),
  details: z.object({
    breed: text(60).min(1),
    ageYears: z.number().min(0).max(40),
    /** Litres per day, for milk animals. */
    milkLitresPerDay: z.number().min(0).max(60).optional(),
    vaccinations: text(300).default(''),
    purpose: z.enum(LIVESTOCK_PURPOSES),
    count: z.number().int().min(1).max(50).default(1),
  }),
});

export const createServiceBodySchema = z.union([equipmentSchema, labourSchema, livestockSchema]);
export type CreateServiceBody = z.infer<typeof createServiceBodySchema>;

export const updateServiceBodySchema = z
  .object({
    pricePaise: z.number().int().min(0).max(SERVICE_RULES.maxPricePaise),
    availableDates: datesSchema,
    status: z.enum(['active', 'paused']),
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, 'nothing to change');
export type UpdateServiceBody = z.infer<typeof updateServiceBodySchema>;

export const serviceSearchSchema = z
  .object({
    kind: z.enum(SERVICE_KINDS),
    side: z.enum(SERVICE_SIDES).default('offer'),
    typeId: z.string().trim().max(30).optional(),
    skill: z.enum(keys(LABOUR_SKILLS)).optional(),
    /** Only listings free on this day. */
    date: isoDateSchema.optional(),
    lat: z.coerce.number().min(6).max(37).optional(),
    lon: z.coerce.number().min(68).max(98).optional(),
    radiusKm: z.coerce.number().min(1).max(SERVICE_RULES.searchRadiusKm.max).default(SERVICE_RULES.searchRadiusKm.default),
    page: z.coerce.number().int().min(1).max(200).default(1),
  })
  .refine((query) => (query.lat === undefined) === (query.lon === undefined), 'lat and lon go together');
export type ServiceSearch = z.infer<typeof serviceSearchSchema>;

export const bookingBodySchema = z.object({
  dates: z
    .array(isoDateSchema)
    .max(SERVICE_RULES.maxDatesPerBooking)
    .default([])
    .transform((dates) => [...new Set(dates)].sort()),
  note: text(SERVICE_RULES.maxNoteLength).optional(),
});
export type BookingBody = z.infer<typeof bookingBodySchema>;

export const bookingStepSchema = z.object({ to: z.enum(['accepted', 'rejected', 'cancelled', 'completed']) });
export const bookingRatingSchema = z.object({ stars: z.number().int().min(1).max(5), comment: text(300).optional() });

export interface ServiceOwner {
  id: string;
  name: string;
  rating: { average: number | null; count: number };
}

/** What everybody sees. Never a phone number. */
export interface PublicServiceView {
  id: string;
  kind: ServiceKind;
  side: ServiceSide;
  typeId: string;
  skills: string[];
  title: string;
  description: string;
  details: Record<string, unknown>;
  photoUrls: string[];
  village: string;
  place: { district?: string; tehsil?: string };
  pricePaise: number;
  priceUnit: PriceUnit;
  /** Days still free (today or later, not booked). */
  freeDates: string[];
  owner: ServiceOwner;
  distanceKm?: number;
  rating: { average: number | null; count: number };
  createdAt: Date;
}

/** The owner's own view (and the coordinator's): with the approval state. */
export interface OwnServiceView extends PublicServiceView {
  status: ServiceStatus;
  rejectReason?: string;
  bookedDates: string[];
}

export interface BookingView {
  id: string;
  listingId: string;
  kind: ServiceKind;
  title: string;
  dates: string[];
  note?: string;
  pricePaise: number;
  priceUnit: PriceUnit;
  status: BookingStatus;
  history: { status: BookingStatus; at: Date; byRole: string }[];
  owner: { name: string };
  requester: { name: string };
  viewerRole: BookingActor;
  allowedNext: BookingStatus[];
  /** Phone numbers, only after both said yes. */
  contact?: { ownerPhone?: string; requesterPhone?: string };
  rating?: { stars: number; comment?: string };
  canRate: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** A labour match: the other side's listing, how well it fits, and why. */
export interface LabourMatch {
  listing: PublicServiceView;
  score: number;
  sharedSkills: string[];
  sharedDates: string[];
}
