import { ApiError, type GoogleGenAI } from '@google/genai';
import { describe, expect, it, vi } from 'vitest';
import { GeminiProvider } from '../src/services/ai/geminiProvider.js';
import { healthyDiagnosis, JPEG_BYTES } from './helpers.js';

type GenerateContent = GoogleGenAI['models']['generateContent'];

const input = { image: JPEG_BYTES, mimeType: 'image/jpeg' as const, cropName: 'बाजरा (Bajra)' };

function textResponse(text: string) {
  return { text } as Awaited<ReturnType<GenerateContent>>;
}

function createProvider(generateContent: GenerateContent) {
  const sleep = vi.fn(async (_ms: number) => undefined);
  const client = { models: { generateContent } } as unknown as Pick<GoogleGenAI, 'models'>;
  const provider = new GeminiProvider({ apiKey: 'k', model: 'test-model', client, sleep });
  return { provider, sleep };
}

describe('GeminiProvider', () => {
  it('returns the validated diagnosis', async () => {
    const generate = vi.fn<GenerateContent>(async () => textResponse(JSON.stringify(healthyDiagnosis)));
    const { provider } = createProvider(generate);

    await expect(provider.diagnose(input)).resolves.toEqual(healthyDiagnosis);
  });

  it('sends the image, crop name, system prompt and JSON mode', async () => {
    const generate = vi.fn<GenerateContent>(async () => textResponse(JSON.stringify(healthyDiagnosis)));
    const { provider } = createProvider(generate);
    await provider.diagnose(input);

    const params = generate.mock.calls[0]?.[0];
    expect(params?.model).toBe('test-model');
    expect(params?.config?.responseMimeType).toBe('application/json');
    expect(params?.config?.systemInstruction).toContain('agronomist');
    expect(JSON.stringify(params?.contents)).toContain(JPEG_BYTES.toString('base64'));
    expect(JSON.stringify(params?.contents)).toContain('बाजरा');
  });

  it.each([429, 503])('retries HTTP %i with growing delays, then succeeds', async (status) => {
    const generate = vi
      .fn<GenerateContent>()
      .mockRejectedValueOnce(new ApiError({ message: 'busy', status }))
      .mockRejectedValueOnce(new ApiError({ message: 'busy', status }))
      .mockResolvedValueOnce(textResponse(JSON.stringify(healthyDiagnosis)));
    const { provider, sleep } = createProvider(generate);

    await expect(provider.diagnose(input)).resolves.toEqual(healthyDiagnosis);
    expect(generate).toHaveBeenCalledTimes(3);
    const [first, second] = sleep.mock.calls.map(([ms]) => ms);
    expect(second).toBeGreaterThan(first ?? Infinity);
  });

  it('gives up with RATE_LIMITED after 3 busy attempts', async () => {
    const generate = vi.fn<GenerateContent>(async () => {
      throw new ApiError({ message: 'quota', status: 429 });
    });
    const { provider } = createProvider(generate);

    await expect(provider.diagnose(input)).rejects.toMatchObject({ code: 'RATE_LIMITED' });
    expect(generate).toHaveBeenCalledTimes(3);
  });

  it('does not retry other API errors', async () => {
    const generate = vi.fn<GenerateContent>(async () => {
      throw new ApiError({ message: 'bad key', status: 400 });
    });
    const { provider } = createProvider(generate);

    await expect(provider.diagnose(input)).rejects.toMatchObject({ code: 'AI_ERROR' });
    expect(generate).toHaveBeenCalledOnce();
  });

  it('maps timeouts to AI_TIMEOUT', async () => {
    const generate = vi.fn<GenerateContent>(async () => {
      throw new DOMException('timed out', 'TimeoutError');
    });
    const { provider } = createProvider(generate);

    await expect(provider.diagnose(input)).rejects.toMatchObject({ code: 'AI_TIMEOUT' });
  });

  it.each([
    ['invalid JSON', 'not json {'],
    ['empty text', ''],
    ['wrong shape', JSON.stringify({ ...healthyDiagnosis, confidence: 'very sure' })],
    ['missing field', JSON.stringify({ is_plant_image: true, confidence: 'high' })],
  ])('rejects %s as AI_ERROR', async (_label, text) => {
    const generate = vi.fn<GenerateContent>(async () => textResponse(text));
    const { provider } = createProvider(generate);

    await expect(provider.diagnose(input)).rejects.toMatchObject({ code: 'AI_ERROR' });
  });
});

describe('GeminiProvider.chat', () => {
  const { is_plant_image: _p, confidence: _c, ...diagnosis } = healthyDiagnosis;
  const chatInput = {
    cropName: 'बाजरा (Bajra)',
    diagnosis,
    messages: [
      { role: 'assistant' as const, text: 'पुराना जवाब' },
      { role: 'user' as const, text: 'ये दवाई कब डालूँ?' },
      { role: 'assistant' as const, text: 'शाम को।' },
      { role: 'user' as const, text: 'कितनी बार?' },
    ],
  };

  it('returns the validated answer', async () => {
    const generate = vi.fn<GenerateContent>(async () => textResponse(JSON.stringify({ answer: 'हफ्ते में एक बार।' })));
    const { provider } = createProvider(generate);

    await expect(provider.chat(chatInput)).resolves.toBe('हफ्ते में एक बार।');
  });

  it('puts the diagnosis in the system prompt and the history as turns starting with the farmer', async () => {
    const generate = vi.fn<GenerateContent>(async () => textResponse(JSON.stringify({ answer: 'ठीक है।' })));
    const { provider } = createProvider(generate);
    await provider.chat(chatInput);

    const params = generate.mock.calls[0]?.[0];
    expect(params?.config?.systemInstruction).toContain(diagnosis.problem_name);
    expect(params?.config?.systemInstruction).toContain('not about farming');
    expect(params?.contents).toEqual([
      { role: 'user', parts: [{ text: 'ये दवाई कब डालूँ?' }] },
      { role: 'model', parts: [{ text: 'शाम को।' }] },
      { role: 'user', parts: [{ text: 'कितनी बार?' }] },
    ]);
    expect(JSON.stringify(params?.contents)).not.toContain('inlineData');
  });

  it('retries busy errors like diagnose does', async () => {
    const generate = vi
      .fn<GenerateContent>()
      .mockRejectedValueOnce(new ApiError({ message: 'busy', status: 429 }))
      .mockResolvedValueOnce(textResponse(JSON.stringify({ answer: 'ठीक है।' })));
    const { provider } = createProvider(generate);

    await expect(provider.chat(chatInput)).resolves.toBe('ठीक है।');
    expect(generate).toHaveBeenCalledTimes(2);
  });

  it('rejects an empty answer as AI_ERROR', async () => {
    const generate = vi.fn<GenerateContent>(async () => textResponse(JSON.stringify({ answer: '' })));
    const { provider } = createProvider(generate);

    await expect(provider.chat(chatInput)).rejects.toMatchObject({ code: 'AI_ERROR' });
  });
});
