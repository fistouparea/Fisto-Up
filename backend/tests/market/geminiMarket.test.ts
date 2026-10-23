import type { GoogleGenAI } from '@google/genai';
import { describe, expect, it, vi } from 'vitest';
import { GeminiProvider } from '../../src/services/ai/geminiProvider.js';
import { redactPersonalData } from '../../src/services/ai/marketPrompt.js';
import { bajraListingDraft, JPEG_BYTES } from '../helpers.js';

type GenerateContent = GoogleGenAI['models']['generateContent'];

function providerReturning(text: string) {
  const generate = vi.fn<GenerateContent>(async () => ({ text }) as Awaited<ReturnType<GenerateContent>>);
  const client = { models: { generateContent: generate } } as unknown as Pick<GoogleGenAI, 'models'>;
  return { provider: new GeminiProvider({ apiKey: 'k', model: 'm', client, sleep: async () => undefined }), generate };
}

const input = { image: JPEG_BYTES, mimeType: 'image/jpeg' as const, sellerText: 'दस क्विंटल बाजरा' };

describe('GeminiProvider.draftListing', () => {
  it('returns the validated draft and sends the photo, the words and the listing prompt in JSON mode', async () => {
    const { provider, generate } = providerReturning(JSON.stringify(bajraListingDraft));
    await expect(provider.draftListing(input)).resolves.toEqual(bajraListingDraft);

    const params = generate.mock.calls[0]?.[0];
    expect(params?.config?.responseMimeType).toBe('application/json');
    expect(params?.config?.systemInstruction).toContain('self-help-group');
    expect(JSON.stringify(params?.contents)).toContain(JPEG_BYTES.toString('base64'));
    expect(JSON.stringify(params?.contents)).toContain('दस क्विंटल बाजरा');
  });

  it.each([
    ['an unknown product', { product: 'gold' }],
    ['a negative price', { price_per_unit_rupees: -5 }],
    ['a missing field', { title_hi: undefined }],
  ])('rejects %s as AI_ERROR', async (_label, override) => {
    const { provider } = providerReturning(JSON.stringify({ ...bajraListingDraft, ...override }));
    await expect(provider.draftListing(input)).rejects.toMatchObject({ code: 'AI_ERROR' });
  });
});

describe('redactPersonalData', () => {
  it.each(['9829012345', '+91 98290 12345', '91-9829012345', '98290-12345'])('removes the phone number %s', (phone) => {
    expect(redactPersonalData(`मेरा नंबर ${phone} है`)).toBe('मेरा नंबर [नंबर] है');
  });

  it('keeps quantities and prices', () => {
    expect(redactPersonalData('10 क्विंटल, 2500 रुपये')).toBe('10 क्विंटल, 2500 रुपये');
  });
});

describe('GeminiProvider.estimatePrice', () => {
  it('sends only the product name and unit and returns the validated estimate', async () => {
    const estimate = { min_rupees: 180, max_rupees: 240, confidence: 'medium' };
    const { provider, generate } = providerReturning(JSON.stringify(estimate));
    await expect(provider.estimatePrice({ productName: 'पापड़ (Papad)', unit: 'pack' })).resolves.toEqual(estimate);
    expect(JSON.stringify(generate.mock.calls[0]?.[0]?.contents)).toBe(
      JSON.stringify([{ role: 'user', parts: [{ text: 'Product: पापड़ (Papad)\nUnit: one pack' }] }]),
    );
  });

  it('rejects a negative estimate as AI_ERROR', async () => {
    const { provider } = providerReturning(JSON.stringify({ min_rupees: -1, max_rupees: 5, confidence: 'high' }));
    await expect(provider.estimatePrice({ productName: 'x', unit: 'kg' })).rejects.toMatchObject({ code: 'AI_ERROR' });
  });
});
