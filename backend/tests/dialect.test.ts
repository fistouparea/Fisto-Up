import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { DIALECT_GLOSSARY } from '../src/data/dialectGlossary.js';
import { PACKET_DOSE_NOTE } from '../src/services/dawaiSafety.js';
import { buildChatSystemPrompt } from '../src/services/ai/prompt.js';
import { INTENT_SYSTEM_PROMPT } from '../src/services/ai/voicePrompt.js';
import { createFakeProvider, createTestApp, healthyDiagnosis } from './helpers.js';

const { is_plant_image: _p, confidence: _c, ...diagnosis } = healthyDiagnosis;
const body = (extra: Record<string, unknown> = {}) => ({ crop: 'bajra', diagnosis, messages: [{ role: 'user', text: 'लट लागगी, कांई करूं?' }], ...extra });

describe('dialect glossary and Rajasthani answers', () => {
  it('the glossary reaches the chat and voice prompts', () => {
    const chat = buildChatSystemPrompt('बाजरा', diagnosis);
    for (const { word } of DIALECT_GLOSSARY.slice(0, 5)) {
      expect(chat).toContain(word);
      expect(INTENT_SYSTEM_PROMPT).toContain(word);
    }
  });

  it('a Rajasthani answer keeps every medicine safety rule', () => {
    const raj = buildChatSystemPrompt('बाजरा', diagnosis, 'raj');
    expect(raj).toContain('Rajasthani');
    expect(raj).toContain(PACKET_DOSE_NOTE);
    expect(raj).toContain('Never name or promote a brand');
    expect(raj).toContain('KVK');
    expect(buildChatSystemPrompt('बाजरा', diagnosis)).not.toContain('Answer in simple Rajasthani');
  });

  it('"जवाब राजस्थानी में" is passed on; nothing else is added', async () => {
    const provider = createFakeProvider();
    expect((await request(createTestApp(provider)).post('/api/chat').send(body({ answerLanguage: 'raj' }))).status).toBe(200);
    const input = provider.chat.mock.calls[0]?.[0];
    expect(Object.keys(input ?? {}).sort()).toEqual(['answerLanguage', 'cropName', 'diagnosis', 'messages']);
    expect(input?.answerLanguage).toBe('raj');
  });

  it('refuses an unknown answer language', async () => {
    expect((await request(createTestApp()).post('/api/chat').send(body({ answerLanguage: 'fr' }))).status).toBe(400);
  });
});
