import { z } from 'zod';
import { SCHEME_CHECK_LINE, SCHEMES, SCHEME_STATUSES, type SchemeData } from '../../data/schemes.js';
import { AppError } from '../../errors/AppError.js';
import { FarmProfileModel } from '../../models/FarmProfile.js';
import { deviceIdSchema } from '../../types/history.js';
import { SchemeOverrideModel } from './scheme.model.js';

export type SchemeView = Omit<SchemeData, 'hint'> & {
  /** Why it may fit this farm (from the farm profile). Never a promise: see `checkLine`. */
  hints: string[];
  checkLine: string;
};

const officialUrl = z.url().max(300).refine((url) => url.startsWith('https://'), 'https only');
const listOfLines = z.array(z.string().trim().min(2).max(200)).max(10);

/** What a coordinator may correct. Every field optional; `status: "verified"` needs a source and a date. */
export const schemeUpdateSchema = z
  .object({
    summary: z.string().trim().min(10).max(500),
    whoCanApply: listOfLines,
    documents: listOfLines,
    officialLink: officialUrl,
    helpline: z.string().trim().regex(/^[0-9 -]{3,20}$/, 'phone number').or(z.literal('')),
    source_url: officialUrl,
    last_verified: z.iso.date(),
    status: z.enum(SCHEME_STATUSES),
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, 'nothing to change');
export type SchemeUpdate = z.infer<typeof schemeUpdateSchema>;

export const forMeQuerySchema = z.object({ deviceId: deviceIdSchema.optional() });

/** Data file + coordinator corrections. */
export async function listSchemes(): Promise<SchemeData[]> {
  const overrides = await SchemeOverrideModel.find().lean().exec();
  const byId = new Map(overrides.map((row) => [row.schemeId, row]));
  return SCHEMES.map((scheme) => {
    const row = byId.get(scheme.id);
    if (!row) return scheme;
    return {
      ...scheme,
      ...(row.summary && { summary: row.summary }),
      ...(row.whoCanApply && { whoCanApply: row.whoCanApply }),
      ...(row.documents && { documents: row.documents }),
      ...(row.officialLink && { officialLink: row.officialLink }),
      ...(row.helpline !== undefined && row.helpline !== null && { helpline: row.helpline || null }),
      ...(row.source_url && { source_url: row.source_url }),
      ...(row.last_verified && { last_verified: row.last_verified }),
      ...(row.status && { status: row.status }),
    };
  });
}

/**
 * "मेरे लिए योजनाएँ": every scheme, with simple hints from this phone's farm profile; schemes with a hint first.
 * Without a profile there are no hints. The check line is always there.
 */
export async function schemesFor(deviceId: string | undefined): Promise<SchemeView[]> {
  const [schemes, profile] = await Promise.all([
    listSchemes(),
    deviceId ? FarmProfileModel.findOne({ deviceId }, { crops: 1, irrigation: 1 }).lean().exec() : null,
  ]);
  const views = schemes.map(({ hint, ...scheme }) => {
    const hints: string[] = [];
    if (hint.farmsLand && profile && profile.crops.length > 0) hints.push(hint.farmsLand);
    if (hint.irrigation && profile?.irrigation && hint.irrigation.sources.includes(profile.irrigation)) hints.push(hint.irrigation.text);
    return { ...scheme, hints, checkLine: SCHEME_CHECK_LINE };
  });
  return views.sort((a, b) => Number(b.hints.length > 0) - Number(a.hints.length > 0));
}

export async function updateScheme(schemeId: string, change: SchemeUpdate, coordinatorId: string): Promise<SchemeData> {
  const scheme = SCHEMES.find((item) => item.id === schemeId);
  if (!scheme) throw new AppError('NOT_FOUND');
  const merged = { ...(await listSchemes()).find((item) => item.id === schemeId), ...change };
  if (merged.status === 'verified' && (!merged.source_url || !merged.last_verified)) {
    throw new AppError('INVALID_INPUT', 'A verified scheme needs a source and a date');
  }
  await SchemeOverrideModel.updateOne({ schemeId }, { $set: { ...change, updatedBy: coordinatorId } }, { upsert: true }).exec();
  const updated = (await listSchemes()).find((item) => item.id === schemeId);
  if (!updated) throw new AppError('NOT_FOUND');
  return updated;
}
