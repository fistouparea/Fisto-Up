import { readFileSync } from 'node:fs';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { loadEnv } from '../src/config/env.js';
import { DEMO_CHAT_NOT_RECORDED, RecordedAiProvider } from '../src/demo/recordedAiProvider.js';
import { RecordedWeatherProvider } from '../src/demo/recordedWeather.js';
import { imageSize, loadRecordings, normalizeText } from '../src/demo/recordings.js';
import { createAiProvider } from '../src/services/ai/createAiProvider.js';
import { CROPS, diagnosisSchema } from '../src/types/diagnosis.js';
import { createTestApp } from './helpers.js';

const recordings = loadRecordings();
const photo = (name: string) => readFileSync(new URL(`../demo/photos/${name}`, import.meta.url));
const base = { GEMINI_API_KEY: 'test-key', GEMINI_MODEL: 'test-model' };

/** A JPEG header with only a frame size (enough for imageSize). */
function jpegHeader(width: number, height: number): Buffer {
  return Buffer.from([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, height >> 8, height & 0xff, width >> 8, width & 0xff, 0x03, 0, 0, 0, 0, 0, 0, 0, 0]);
}

describe('demo mode (recorded real AI answers)', () => {
  it('can never be switched on in production', () => {
    const production = { ...base, NODE_ENV: 'production', CORS_ORIGIN: 'https://a.example.com', MONGO_URI: 'mongodb://x/agriai', JWT_SECRET: 'x'.repeat(32) };
    expect(() => loadEnv({ ...production, DEMO_MODE: 'true' })).toThrow(/DEMO_MODE/);
    expect(loadEnv({ ...production, DEMO_MODE: 'false' }).DEMO_MODE).toBe(false);
    expect(() => new RecordedAiProvider(recordings, 'production')).toThrow(/production/);
  });

  it('is off unless DEMO_MODE=true, and then the AI factory replays recordings', () => {
    expect(loadEnv(base).DEMO_MODE).toBeUndefined();
    expect(createAiProvider(loadEnv(base))).not.toBeInstanceOf(RecordedAiProvider);
    expect(createAiProvider(loadEnv({ ...base, DEMO_MODE: 'true' }))).toBeInstanceOf(RecordedAiProvider);
  });

  it('the saved recordings are valid real answers for every demo photo', () => {
    expect(recordings.diagnoses.map((item) => item.photo)).toEqual(expect.arrayContaining(['sarson-white-rust.jpg', 'sarson-aphid.jpg', 'bajra-downy-mildew.jpg', 'handicraft.jpg']));
    const notAPlant = recordings.diagnoses.find((item) => item.photo === 'handicraft.jpg');
    expect(notAPlant?.response.is_plant_image === false || notAPlant?.response.confidence === 'low').toBe(true);
  });

  it('reads the photo size from JPEG and PNG headers', () => {
    expect(imageSize(jpegHeader(1024, 768))).toEqual({ width: 1024, height: 768 });
    const png = Buffer.alloc(32);
    png.writeUInt32BE(0x89504e47, 0);
    png.writeUInt32BE(300, 16);
    png.writeUInt32BE(200, 20);
    expect(imageSize(png)).toEqual({ width: 300, height: 200 });
    expect(imageSize(Buffer.from('not an image'))).toBeNull();
  });

  it('replays the answer for a recorded photo, also after the phone has shrunk it', async () => {
    const ai = new RecordedAiProvider(recordings, 'test');
    const original = await ai.diagnose({ image: photo('sarson-aphid.jpg'), mimeType: 'image/jpeg', cropName: CROPS.sarson });
    expect(original).toEqual(recordings.diagnoses.find((item) => item.photo === 'sarson-aphid.jpg')?.response);
    const recorded = recordings.diagnoses.find((item) => item.photo === 'sarson-aphid.jpg');
    const shrunk = jpegHeader(1024, Math.round(1024 / (recorded?.aspect ?? 1)));
    expect(await ai.diagnose({ image: shrunk, mimeType: 'image/jpeg', cropName: CROPS.sarson })).toEqual(original);
  });

  it('never guesses for a photo that was not recorded (or the wrong crop): low confidence → "unclear"', async () => {
    const ai = new RecordedAiProvider(recordings, 'test');
    const unknown = await ai.diagnose({ image: jpegHeader(1000, 1000), mimeType: 'image/jpeg', cropName: CROPS.sarson });
    expect(unknown.confidence).toBe('low');
    const wrongCrop = await ai.diagnose({ image: photo('sarson-aphid.jpg'), mimeType: 'image/jpeg', cropName: CROPS.chana });
    expect(wrongCrop.confidence).toBe('low');

    const res = await request(createTestApp(ai)).post('/api/diagnose').field('crop', 'chana').attach('image', jpegHeader(1000, 1000), { filename: 'x.jpg', contentType: 'image/jpeg' });
    expect(res.body).toEqual({ status: 'unclear' });
  });

  it('replays chat answers for the suggested questions, and says so plainly for other questions', async () => {
    const ai = new RecordedAiProvider(recordings, 'test');
    const chat = recordings.chats[0];
    if (!chat) throw new Error('no recorded chat');
    const diagnosis = diagnosisSchema.parse(recordings.diagnoses[0]?.response);
    expect(await ai.chat({ cropName: chat.cropName, diagnosis, messages: [{ role: 'user', text: ` ${chat.question.replace('?', '')} ` }] })).toBe(chat.answer);
    expect(await ai.chat({ cropName: chat.cropName, diagnosis, messages: [{ role: 'user', text: 'कुछ और पूछना है' }] })).toBe(DEMO_CHAT_NOT_RECORDED);
    expect(normalizeText('ये दवाई कब डालूँ?')).toBe(normalizeText('ये  दवाई कब डालूँ'));
  });

  it('replays the selling draft only for the recorded photo and sentence (otherwise the seller types it)', async () => {
    const ai = new RecordedAiProvider(recordings, 'test');
    const draft = recordings.listingDrafts[0];
    if (!draft) throw new Error('no recorded draft');
    const image = readFileSync(new URL(`../seed-assets/${draft.photo}`, import.meta.url));
    expect(await ai.draftListing({ image, mimeType: 'image/jpeg', sellerText: draft.sellerText })).toEqual(draft.response);
    await expect(ai.draftListing({ image, mimeType: 'image/jpeg', sellerText: 'पाँच क्विंटल चना' })).rejects.toMatchObject({ code: 'AI_ERROR' });
  });

  it('replays the recorded forecast with today as the first day', async () => {
    const weather = new RecordedWeatherProvider(recordings.forecast, () => '2027-01-15');
    const forecast = await weather.getForecast();
    expect(forecast.days[0]?.date).toBe('2027-01-15');
    expect(forecast.days[1]?.date).toBe('2027-01-16');
    expect(forecast.days[0]?.tempMax).toBe(recordings.forecast.data.days[0]?.tempMax);
    expect(forecast.past.at(-1)?.date).toBe('2027-01-14');
  });
});
