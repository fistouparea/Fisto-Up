import { ApiError, type GoogleGenAI } from '@google/genai';
import { describe, expect, it, vi } from 'vitest';
import { loadEnv } from '../src/config/env.js';
import { GeminiProvider } from '../src/services/ai/geminiProvider.js';
import { bajraListingDraft, healthyDiagnosis, JPEG_BYTES } from './helpers.js';

type GenerateContent = GoogleGenAI['models']['generateContent'];
type Params = Parameters<GenerateContent>[0];
const ok = (value: unknown) => ({ text: JSON.stringify(value) }) as Awaited<ReturnType<GenerateContent>>;
const busy = () => new ApiError({ message: 'This model is currently experiencing high demand', status: 503 });

function provider(generate: GenerateContent, fallbackModels: string[]) {
  const client = { models: { generateContent: generate } } as unknown as Pick<GoogleGenAI, 'models'>;
  return new GeminiProvider({ apiKey: 'k', model: 'main-model', fallbackModels, client, sleep: async () => undefined });
}

const listingInput = { image: JPEG_BYTES, mimeType: 'image/jpeg' as const, sellerText: 'दस क्विंटल बाजरा' };
const modelsUsed = (generate: ReturnType<typeof vi.fn<GenerateContent>>) => generate.mock.calls.map(([params]: [Params]) => params.model);

describe('Gemini fallback models', () => {
  it('uses the next model when the main one stays busy ("high demand")', async () => {
    const generate = vi.fn<GenerateContent>(async (params) => {
      if (params.model === 'main-model') throw busy();
      return ok(bajraListingDraft);
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await expect(provider(generate, ['backup-model']).draftListing(listingInput)).resolves.toEqual(bajraListingDraft);
    expect(modelsUsed(generate)).toEqual(['main-model', 'main-model', 'main-model', 'backup-model']);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('main-model'));
  });

  it('moves on immediately after a timeout (no long retries on a hanging model)', async () => {
    const generate = vi.fn<GenerateContent>(async (params) => {
      if (params.model === 'main-model') throw Object.assign(new Error('This operation was aborted'), { name: 'AbortError' });
      return ok(healthyDiagnosis);
    });
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await expect(provider(generate, ['backup-model']).diagnose({ image: JPEG_BYTES, mimeType: 'image/jpeg', cropName: 'बाजरा' })).resolves.toEqual(
      healthyDiagnosis,
    );
    expect(modelsUsed(generate)).toEqual(['main-model', 'backup-model']);
  });

  it('also falls back when the main model answers with JSON that fails validation', async () => {
    const generate = vi.fn<GenerateContent>(async (params) => ok(params.model === 'main-model' ? { nonsense: true } : bajraListingDraft));
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await expect(provider(generate, ['backup-model']).draftListing(listingInput)).resolves.toEqual(bajraListingDraft);
  });

  it('reports the last error when every model fails, and behaves as before without fallbacks', async () => {
    const generate = vi.fn<GenerateContent>(async () => {
      throw busy();
    });
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await expect(provider(generate, ['backup-model']).draftListing(listingInput)).rejects.toMatchObject({ code: 'RATE_LIMITED' });
    expect(modelsUsed(generate)).toEqual(['main-model', 'main-model', 'main-model', 'backup-model', 'backup-model', 'backup-model']);

    generate.mockClear();
    await expect(provider(generate, []).draftListing(listingInput)).rejects.toMatchObject({ code: 'RATE_LIMITED' });
    expect(modelsUsed(generate)).toEqual(['main-model', 'main-model', 'main-model']);
  });

  it('reads GEMINI_FALLBACK_MODELS as a comma list (empty = none)', () => {
    const base = { GEMINI_API_KEY: 'k', GEMINI_MODEL: 'm' };
    expect(loadEnv({ ...base, GEMINI_FALLBACK_MODELS: ' gemini-3.5-flash , gemini-3.1-flash-lite ,' }).GEMINI_FALLBACK_MODELS).toEqual([
      'gemini-3.5-flash',
      'gemini-3.1-flash-lite',
    ]);
    expect(loadEnv({ ...base, GEMINI_FALLBACK_MODELS: '' }).GEMINI_FALLBACK_MODELS).toEqual([]);
    expect(loadEnv(base).GEMINI_FALLBACK_MODELS).toEqual([]);
  });
});

describe('GEMINI_ATTEMPT_TIMEOUT_SECONDS', () => {
  it('is optional, 5–120 seconds, and empty counts as not set', () => {
    const base = { GEMINI_API_KEY: 'k', GEMINI_MODEL: 'm' };
    expect(loadEnv({ ...base, GEMINI_ATTEMPT_TIMEOUT_SECONDS: '25' }).GEMINI_ATTEMPT_TIMEOUT_SECONDS).toBe(25);
    expect(loadEnv({ ...base, GEMINI_ATTEMPT_TIMEOUT_SECONDS: '' }).GEMINI_ATTEMPT_TIMEOUT_SECONDS).toBeUndefined();
    expect(() => loadEnv({ ...base, GEMINI_ATTEMPT_TIMEOUT_SECONDS: '2' })).toThrow(/GEMINI_ATTEMPT_TIMEOUT_SECONDS/);
  });
});
