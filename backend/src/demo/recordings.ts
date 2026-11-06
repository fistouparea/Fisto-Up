/**
 * Saved real AI answers (and one real weather forecast) for the offline demo (DEMO_MODE).
 * Made by `npm run demo:record` with the real Gemini model and Open-Meteo; replayed by RecordedAiProvider.
 * Every answer is validated with the same schemas as live AI answers before it can be replayed.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { VOICE_INTENT_IDS } from '../config/voiceIntents.js';
import { aiListingDraftSchema } from '../modules/listings/listing.types.js';
import { aiPriceEstimateSchema } from '../modules/pricing/pricing.types.js';
import { aiDiagnosisSchema } from '../types/diagnosis.js';

const daySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weatherCode: z.number(),
  tempMax: z.number(),
  tempMin: z.number(),
  rainMm: z.number(),
  rainChance: z.number(),
  windMax: z.number(),
  gustMax: z.number(),
  et0: z.number().nullable(),
});

export const forecastSchema = z.object({
  fetchedAt: z.string(),
  current: z.object({ temperature: z.number(), weatherCode: z.number(), windSpeed: z.number() }).nullable(),
  days: z.array(daySchema).min(1),
  past: z.array(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), rainMm: z.number() })),
});

export const recordingsSchema = z.object({
  recordedAt: z.string(),
  /** The real model that gave these answers. */
  model: z.string(),
  diagnoses: z.array(
    z.object({
      photo: z.string(),
      /** Crop name as sent to the AI (CROPS[id]). */
      cropName: z.string(),
      /** Width / height of the photo: the phone shrinks photos, but keeps their shape. */
      aspect: z.number().positive(),
      response: aiDiagnosisSchema,
    }),
  ),
  chats: z.array(z.object({ cropName: z.string(), question: z.string(), answerLanguage: z.enum(['hi', 'raj']), answer: z.string().min(1) })),
  listingDrafts: z.array(z.object({ photo: z.string(), aspect: z.number().positive(), sellerText: z.string(), response: aiListingDraftSchema })),
  prices: z.array(z.object({ productName: z.string(), unit: z.string(), response: aiPriceEstimateSchema })),
  intents: z.array(z.object({ text: z.string(), intent: z.enum(VOICE_INTENT_IDS).nullable() })),
  forecast: z.object({ place: z.string(), lat: z.number(), lon: z.number(), data: forecastSchema }),
});

export type Recordings = z.infer<typeof recordingsSchema>;

export const RECORDINGS_FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../demo/recordings.json');

export function loadRecordings(file: string = RECORDINGS_FILE): Recordings {
  return recordingsSchema.parse(JSON.parse(readFileSync(file, 'utf8')));
}

/** Same question, ignoring spaces, case and punctuation (। ? ! , .). */
export function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[\s।?!,.;:'"“”‘’-]+/g, ' ').trim();
}

/** Width/height of a JPEG or PNG from its header (no decoding), or null. */
export function imageSize(image: Buffer): { width: number; height: number } | null {
  if (image.length > 24 && image.readUInt32BE(0) === 0x89504e47) return { width: image.readUInt32BE(16), height: image.readUInt32BE(20) };
  if (image.length < 4 || image[0] !== 0xff || image[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < image.length) {
    if (image[offset] !== 0xff) return null;
    const marker = image[offset + 1] ?? 0;
    const length = image.readUInt16BE(offset + 2);
    // SOF0–SOF15 except DHT (C4), JPG (C8) and DAC (CC) carry the frame size.
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: image.readUInt16BE(offset + 5), width: image.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  return null;
}

export function aspectOf(image: Buffer): number | null {
  const size = imageSize(image);
  return size && size.height > 0 ? size.width / size.height : null;
}

/** Photos match when their shape is the same within 1.5% (the phone's resize rounds to whole pixels). */
export function sameShape(a: number, b: number): boolean {
  return Math.abs(a - b) / b < 0.015;
}
