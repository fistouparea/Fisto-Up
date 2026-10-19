import { z } from 'zod';
import { daysBetween, todayInIndia } from '../utils/dates.js';
import { cropIdSchema } from './diagnosis.js';
import { deviceIdSchema } from './history.js';

export const IRRIGATION_SOURCES = ['tubewell', 'canal', 'rainfed', 'tanka'] as const;
export type IrrigationSource = (typeof IRRIGATION_SOURCES)[number];

/** Oldest sowing date we accept; older crops are long harvested. */
const MAX_CROP_AGE_DAYS = 365;

export const isoDateSchema = z.iso.date();

export const farmLocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  source: z.enum(['gps', 'list']),
  district: z.string().trim().min(1).max(60).optional(),
  tehsil: z.string().trim().min(1).max(60).optional(),
});

export const farmCropSchema = z
  .object({
    crop: cropIdSchema,
    sowingDate: isoDateSchema,
    /** Last day the farmer said "आज पानी दिया". */
    lastWateredOn: isoDateSchema.optional(),
  })
  .refine((crop) => isRecentPast(crop.sowingDate), 'sowingDate must be within the last year and not in the future')
  .refine((crop) => !crop.lastWateredOn || isRecentPast(crop.lastWateredOn), 'lastWateredOn must not be in the future');

/** Every part is optional: each onboarding screen can be skipped. */
export const farmProfileSchema = z.object({
  location: farmLocationSchema.optional(),
  crops: z
    .array(farmCropSchema)
    .max(9)
    .refine((crops) => new Set(crops.map((crop) => crop.crop)).size === crops.length, 'Each crop only once')
    .default([]),
  fieldSizeBigha: z.number().positive().max(10_000).optional(),
  irrigation: z.enum(IRRIGATION_SOURCES).optional(),
});

export type FarmLocation = z.infer<typeof farmLocationSchema>;
export type FarmCrop = z.infer<typeof farmCropSchema>;
export type FarmProfile = z.infer<typeof farmProfileSchema>;

export interface StoredFarmProfile extends FarmProfile {
  updatedAt: Date;
}

export const profileQuerySchema = z.object({ deviceId: deviceIdSchema });
export const saveProfileBodySchema = z.object({ deviceId: deviceIdSchema, profile: farmProfileSchema });
export const markWateredBodySchema = z.object({ deviceId: deviceIdSchema, crop: cropIdSchema });

function isRecentPast(date: string): boolean {
  const age = daysBetween(date, todayInIndia());
  return age >= 0 && age <= MAX_CROP_AGE_DAYS;
}
