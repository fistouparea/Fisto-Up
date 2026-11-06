/**
 * Records REAL AI answers (Gemini, key from .env) and one real Open-Meteo forecast for the offline demo:
 * the demo photos (backend/demo/photos, openly licensed; seed-assets for the "not a plant" and selling photos),
 * the suggested follow-up questions, the selling sentence, SHG prices and a few voice phrases.
 *
 *   npm run demo:record          → backend/demo/recordings.json (replayed by DEMO_MODE / npm run demo)
 *
 * Only photos, crop names and the demo sentences are sent: no farmer data.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadEnv } from '../config/env.js';
import { productInfo, type ProductId, type Unit } from '../config/marketCatalog.js';
import { aspectOf, recordingsSchema, RECORDINGS_FILE, type Recordings } from '../demo/recordings.js';
import { createAiProvider } from '../services/ai/createAiProvider.js';
import { OpenMeteoProvider } from '../services/weather/openMeteoProvider.js';
import { CROPS, type CropId, diagnosisSchema } from '../types/diagnosis.js';

const env = loadEnv({ ...process.env, DEMO_MODE: 'false' });
const ai = createAiProvider(env);
const root = process.cwd();

const PHOTOS: { file: string; crop: CropId }[] = [
  { file: 'demo/photos/sarson-white-rust.jpg', crop: 'sarson' },
  { file: 'demo/photos/sarson-aphid.jpg', crop: 'sarson' },
  { file: 'demo/photos/bajra-downy-mildew.jpg', crop: 'bajra' },
  // Not a plant at all: the app must refuse to guess ("फोटो साफ नहीं").
  { file: 'seed-assets/handicraft.jpg', crop: 'bajra' },
];
/** The three suggested questions on the result screen (frontend hi.chat.suggestions). */
const QUESTIONS = ['ये दवाई कब डालूँ?', 'कितने दिन में ठीक होगा?', 'आगे से कैसे बचाएँ?'];
const SELL = { photo: 'seed-assets/bajra.jpg', text: 'दस क्विंटल बाजरा, पच्चीस सौ रुपये क्विंटल' };
const PRICES: { product: ProductId; unit: Unit }[] = [
  { product: 'achar', unit: 'pack' },
  { product: 'papad', unit: 'pack' },
  { product: 'ker_sangri', unit: 'kg' },
];
const INTENTS = ['आज खेत में क्या करूँ', 'मेरी फसल का भाव बताओ', 'किराये पर ट्रैक्टर चाहिए', 'मंडी कब जाना है'];
const PLACE = { place: 'रतनगढ़, चूरू', lat: 28.08, lon: 74.62 };

const out: Recordings = {
  recordedAt: new Date().toISOString(),
  model: env.GEMINI_FALLBACK_MODELS.length ? `${env.GEMINI_MODEL} (with the fallback models from .env when it was busy)` : env.GEMINI_MODEL,
  diagnoses: [],
  chats: [],
  listingDrafts: [],
  prices: [],
  intents: [],
  forecast: { ...PLACE, data: await new OpenMeteoProvider().getForecast(PLACE.lat, PLACE.lon) },
};
console.log('forecast ok');

for (const { file, crop } of PHOTOS) {
  const image = await readFile(path.join(root, file));
  const aspect = aspectOf(image);
  if (aspect === null) throw new Error(`Not a JPEG/PNG: ${file}`);
  const response = await ai.diagnose({ image, mimeType: 'image/jpeg', cropName: CROPS[crop] });
  out.diagnoses.push({ photo: path.basename(file), cropName: CROPS[crop], aspect, response });
  console.log('diagnose', file, response.confidence, response.problem_name);
  if (!response.is_plant_image || response.confidence === 'low') continue;
  const diagnosis = diagnosisSchema.parse(response);
  for (const question of QUESTIONS) {
    const answer = await ai.chat({ cropName: CROPS[crop], diagnosis, messages: [{ role: 'user', text: question }], answerLanguage: 'hi' });
    out.chats.push({ cropName: CROPS[crop], question, answerLanguage: 'hi', answer });
    console.log('  chat', question);
  }
}

const sellImage = await readFile(path.join(root, SELL.photo));
out.listingDrafts.push({
  photo: path.basename(SELL.photo),
  aspect: aspectOf(sellImage) ?? 1,
  sellerText: SELL.text,
  response: await ai.draftListing({ image: sellImage, mimeType: 'image/jpeg', sellerText: SELL.text }),
});
console.log('listing draft ok');

for (const { product, unit } of PRICES) {
  const info = productInfo(product);
  const productName = `${info.hi} (${info.en})`;
  out.prices.push({ productName, unit, response: await ai.estimatePrice({ productName, unit }) });
}
for (const text of INTENTS) out.intents.push({ text, intent: (await ai.classifyIntent({ text })).intent });

await writeFile(RECORDINGS_FILE, `${JSON.stringify(recordingsSchema.parse(out), null, 2)}\n`);
console.log(`Saved ${path.relative(root, RECORDINGS_FILE)}: ${out.diagnoses.length} photos, ${out.chats.length} answers.`);
