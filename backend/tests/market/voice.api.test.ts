import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { flagDefaults } from '../../src/config/featureFlags.js';
import { VOICE_INTENT_IDS, VOICE_INTENTS } from '../../src/config/voiceIntents.js';
import { FeatureFlags } from '../../src/modules/flags/flag.service.js';
import { matchIntentByKeyword } from '../../src/modules/voice/voiceIntent.service.js';
import { AppError } from '../../src/errors/AppError.js';
import { createFakeProvider } from '../helpers.js';
import { useTestDatabase } from '../setup/testDatabase.js';
import { createMarketTestApp } from './marketHelpers.js';

useTestDatabase();

const voiceOn = () => new FeatureFlags({ ...flagDefaults(undefined), voiceMode: 'all' });
const ask = (app: ReturnType<typeof createMarketTestApp>, text: string) =>
  request(app).post('/api/voice/intent').set('X-Requested-With', 'agriai').send({ text });

describe('voice intent by keyword', () => {
  it.each([
    ['मौसम बताओ', 'weather'],
    ['बाजरा बेचना है', 'sell'],
    ['फसल की जाँच करनी है', 'diagnose'],
    ['मेरी जाँच दिखाओ', 'history'],
    ['पाणी कद देऊं', 'water'],
    ['खाद खरीदनी है', 'buy'],
  ])('"%s" → %s', (text, intent) => {
    expect(matchIntentByKeyword(text)).toBe(intent);
  });

  it('every example phrase maps to its own intent without the AI', () => {
    for (const id of VOICE_INTENT_IDS) {
      for (const example of VOICE_INTENTS[id].examples) expect(matchIntentByKeyword(example), example).toBe(id);
    }
  });
});

describe('POST /api/voice/intent', () => {
  it('is off unless the voiceMode flag allows it', async () => {
    const app = createMarketTestApp();
    expect((await ask(app, 'मौसम बताओ')).status).toBe(403);
  });

  it('answers from keywords without calling the AI', async () => {
    const ai = createFakeProvider();
    const app = createMarketTestApp({}, { aiProvider: ai, flags: voiceOn() });
    const res = await ask(app, 'मौसम बताओ');
    expect(res.body).toEqual({ intent: 'weather', source: 'keyword' });
    expect(ai.classifyIntent).not.toHaveBeenCalled();
  });

  it('asks the (mocked) AI when no keyword fits, without phone numbers', async () => {
    const ai = createFakeProvider(undefined, undefined, { classifyIntent: { intent: 'calendar' } });
    const app = createMarketTestApp({}, { aiProvider: ai, flags: voiceOn() });
    const res = await ask(app, 'अगले हफ़्ते खेत में क्या करूँ 9876543210');
    expect(res.body).toEqual({ intent: 'calendar', source: 'ai' });
    expect(ai.classifyIntent.mock.calls[0]?.[0].text).not.toContain('9876543210');
  });

  it('unknown or a failed AI is "not understood", never an error', async () => {
    const unknown = createMarketTestApp({}, { aiProvider: createFakeProvider(undefined, undefined, { classifyIntent: { intent: null } }), flags: voiceOn() });
    expect((await ask(unknown, 'नमस्ते जी')).body).toEqual({ intent: null, source: 'none' });
    const failing = createMarketTestApp({}, { aiProvider: createFakeProvider(undefined, undefined, { classifyIntent: new AppError('AI_ERROR') }), flags: voiceOn() });
    const res = await ask(failing, 'नमस्ते जी');
    expect(res.status).toBe(200);
    expect(res.body.intent).toBeNull();
  });

  it('validates the text', async () => {
    const app = createMarketTestApp({}, { flags: voiceOn() });
    expect((await ask(app, '')).status).toBe(400);
    expect((await ask(app, 'क'.repeat(301))).status).toBe(400);
  });
});
