import {
  ApiError,
  GoogleGenAI,
  ThinkingLevel,
  Type,
  type Content,
  type GenerateContentParameters,
  type Schema,
} from '@google/genai';
import type { z } from 'zod';
import { AppError } from '../../errors/AppError.js';
import { aiChatAnswerSchema } from '../../types/chat.js';
import { aiDiagnosisSchema, type AiDiagnosis } from '../../types/diagnosis.js';
import { CATEGORIES, PRODUCT_IDS, UNITS } from '../../config/marketCatalog.js';
import { aiListingDraftSchema, type AiListingDraft } from '../../modules/listings/listing.types.js';
import type { AiProvider, ChatInput, DiagnoseInput, ListingDraftInput } from './aiProvider.js';
import {
  buildListingUserPrompt,
  buildPriceEstimatePrompt,
  LISTING_SYSTEM_PROMPT,
  PRICE_ESTIMATE_SYSTEM_PROMPT,
} from './marketPrompt.js';
import { aiPriceEstimateSchema, type AiPriceEstimate } from '../../modules/pricing/pricing.types.js';
import { UNIT_NAMES, type Unit } from '../../config/marketCatalog.js';
import { buildChatSystemPrompt, buildDiagnosisUserPrompt, DIAGNOSIS_SYSTEM_PROMPT } from './prompt.js';
import { withRetry } from './retry.js';

/** HTTP statuses that mean "busy, try again later": rate limited or model overloaded. */
const BUSY_STATUSES = new Set([429, 503]);

/** Gemini-side schema for JSON mode. Mirrors aiDiagnosisSchema, which re-validates the result. */
const DIAGNOSIS_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    is_plant_image: { type: Type.BOOLEAN },
    confidence: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
    problem_name: { type: Type.STRING },
    explanation: { type: Type.STRING },
    desi_upay: { type: Type.ARRAY, items: { type: Type.STRING } },
    dawai: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          kaise_use_karein: { type: Type.STRING },
        },
        required: ['name', 'kaise_use_karein'],
      },
    },
    savdhani: { type: Type.ARRAY, items: { type: Type.STRING } },
    severity: { type: Type.STRING, enum: ['healthy', 'mild', 'serious'] },
  },
  required: ['is_plant_image', 'confidence', 'problem_name', 'explanation', 'desi_upay', 'dawai', 'savdhani', 'severity'],
  propertyOrdering: [
    'is_plant_image',
    'confidence',
    'severity',
    'problem_name',
    'explanation',
    'desi_upay',
    'dawai',
    'savdhani',
  ],
};

/** Mirrors aiChatAnswerSchema. */
const CHAT_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: { answer: { type: Type.STRING } },
  required: ['answer'],
};

/** Mirrors aiListingDraftSchema. */
const LISTING_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    photo_matches_product: { type: Type.BOOLEAN },
    photo_problem: { type: Type.STRING },
    category: { type: Type.STRING, enum: [...CATEGORIES] },
    product: { type: Type.STRING, enum: [...PRODUCT_IDS] },
    quantity: { type: Type.NUMBER, nullable: true },
    unit: { type: Type.STRING, enum: [...UNITS], nullable: true },
    price_per_unit_rupees: { type: Type.NUMBER, nullable: true },
    quality_notes: { type: Type.STRING },
    title_hi: { type: Type.STRING },
    title_en: { type: Type.STRING },
    description_hi: { type: Type.STRING },
    description_en: { type: Type.STRING },
  },
  required: [
    'photo_matches_product',
    'photo_problem',
    'category',
    'product',
    'quantity',
    'unit',
    'price_per_unit_rupees',
    'quality_notes',
    'title_hi',
    'title_en',
    'description_hi',
    'description_en',
  ],
  propertyOrdering: [
    'photo_matches_product',
    'photo_problem',
    'category',
    'product',
    'quantity',
    'unit',
    'price_per_unit_rupees',
    'quality_notes',
    'title_hi',
    'title_en',
    'description_hi',
    'description_en',
  ],
};

/** Mirrors aiPriceEstimateSchema. */
const PRICE_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    min_rupees: { type: Type.NUMBER },
    max_rupees: { type: Type.NUMBER },
    confidence: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
  },
  required: ['min_rupees', 'max_rupees', 'confidence'],
};

type GenerateRequest = Pick<GenerateContentParameters, 'contents'> & {
  systemInstruction: string;
  responseSchema: Schema;
};

export type GeminiThinkingLevel = 'low' | 'medium' | 'high' | 'off';

const THINKING_LEVELS: Record<Exclude<GeminiThinkingLevel, 'off'>, ThinkingLevel> = {
  low: ThinkingLevel.LOW,
  medium: ThinkingLevel.MEDIUM,
  high: ThinkingLevel.HIGH,
};

export interface GeminiProviderOptions {
  apiKey: string;
  model: string;
  /**
   * Tried in order when the main model is busy, times out or returns unusable JSON (e.g. Google's
   * "model is experiencing high demand"). Empty = only the main model.
   */
  fallbackModels?: string[];
  /** Defaults to "low": fast enough for farmers on slow phones. "off" = don't send the setting. */
  thinkingLevel?: GeminiThinkingLevel;
  attemptTimeoutMs?: number;
  maxAttempts?: number;
  baseDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
  /** Injected in tests; defaults to the real Gemini client. */
  client?: Pick<GoogleGenAI, 'models'>;
}

export class GeminiProvider implements AiProvider {
  private readonly client: Pick<GoogleGenAI, 'models'>;
  private readonly models: string[];
  private readonly thinkingLevel: GeminiThinkingLevel;
  private readonly attemptTimeoutMs: number;
  private readonly maxAttempts: number;
  private readonly baseDelayMs: number;
  private readonly sleep: ((ms: number) => Promise<void>) | undefined;

  constructor(options: GeminiProviderOptions) {
    this.client = options.client ?? new GoogleGenAI({ apiKey: options.apiKey });
    this.models = [options.model, ...(options.fallbackModels ?? []).filter((model) => model !== options.model)];
    this.thinkingLevel = options.thinkingLevel ?? 'low';
    // Newer models take ~20 s for a photo even with low thinking; the phone waits up to 90 s in total.
    this.attemptTimeoutMs = options.attemptTimeoutMs ?? 45_000;
    this.maxAttempts = options.maxAttempts ?? 3;
    this.baseDelayMs = options.baseDelayMs ?? 1_000;
    this.sleep = options.sleep;
  }

  async diagnose({ image, mimeType, cropName }: DiagnoseInput): Promise<AiDiagnosis> {
    return this.generateValidated({
      systemInstruction: DIAGNOSIS_SYSTEM_PROMPT,
      responseSchema: DIAGNOSIS_RESPONSE_SCHEMA,
      contents: [
        {
          role: 'user',
          parts: [{ inlineData: { mimeType, data: image.toString('base64') } }, { text: buildDiagnosisUserPrompt(cropName) }],
        },
      ],
    }, aiDiagnosisSchema);
  }

  async chat({ cropName, diagnosis, messages }: ChatInput): Promise<string> {
    const result = await this.generateValidated({
      systemInstruction: buildChatSystemPrompt(cropName, diagnosis),
      responseSchema: CHAT_RESPONSE_SCHEMA,
      contents: toGeminiContents(messages),
    }, aiChatAnswerSchema);
    return result.answer;
  }

  async draftListing({ image, mimeType, sellerText }: ListingDraftInput): Promise<AiListingDraft> {
    return this.generateValidated({
      systemInstruction: LISTING_SYSTEM_PROMPT,
      responseSchema: LISTING_RESPONSE_SCHEMA,
      contents: [
        {
          role: 'user',
          parts: [{ inlineData: { mimeType, data: image.toString('base64') } }, { text: buildListingUserPrompt(sellerText) }],
        },
      ],
    }, aiListingDraftSchema);
  }

  async estimatePrice({ productName, unit }: { productName: string; unit: Unit }): Promise<AiPriceEstimate> {
    return this.generateValidated({
      systemInstruction: PRICE_ESTIMATE_SYSTEM_PROMPT,
      responseSchema: PRICE_RESPONSE_SCHEMA,
      contents: [{ role: 'user', parts: [{ text: buildPriceEstimatePrompt(productName, UNIT_NAMES[unit].en) }] }],
    }, aiPriceEstimateSchema);
  }

  /**
   * Calls Gemini in JSON mode and validates the answer with `schema`. Busy errors are retried with backoff;
   * if a model stays busy, times out or answers with unusable JSON, the next fallback model is tried.
   */
  private async generateValidated<T>(request: GenerateRequest, schema: z.ZodType<T>): Promise<T> {
    let lastError: AppError | null = null;
    for (const model of this.models) {
      try {
        const rawText = await withRetry(() => this.generateOnce(request, model), {
          maxAttempts: this.maxAttempts,
          baseDelayMs: this.baseDelayMs,
          isRetryable: isBusyError,
          sleep: this.sleep,
        });
        return parseJson(rawText, schema);
      } catch (error) {
        lastError = toAppError(error);
        if (model !== this.models.at(-1)) {
          console.warn(`Gemini model ${model} failed (${lastError.code}), trying the next model`);
        }
      }
    }
    throw lastError ?? new AppError('AI_ERROR', 'No Gemini model configured');
  }

  private async generateOnce({ contents, systemInstruction, responseSchema }: GenerateRequest, model: string): Promise<string> {
    const response = await this.client.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema,
        temperature: 0.2,
        ...(this.thinkingLevel === 'off' ? {} : { thinkingConfig: { thinkingLevel: THINKING_LEVELS[this.thinkingLevel] } }),
        abortSignal: AbortSignal.timeout(this.attemptTimeoutMs),
      },
    });

    const text = response.text;
    if (!text) {
      throw new AppError('AI_ERROR', 'Gemini returned an empty response');
    }
    return text;
  }
}

/** Gemini expects the conversation to start with a user turn, so leading answers are dropped. */
function toGeminiContents(messages: ChatInput['messages']): Content[] {
  const firstUserIndex = messages.findIndex((message) => message.role === 'user');
  return messages.slice(Math.max(firstUserIndex, 0)).map((message) => ({
    role: message.role === 'user' ? 'user' : 'model',
    parts: [{ text: message.text }],
  }));
}

function isBusyError(error: unknown): boolean {
  return error instanceof ApiError && BUSY_STATUSES.has(error.status);
}

function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
}

function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (isBusyError(error)) return new AppError('RATE_LIMITED', 'Gemini is busy', { cause: error });
  if (isTimeoutError(error)) return new AppError('AI_TIMEOUT', 'Gemini request timed out', { cause: error });
  return new AppError('AI_ERROR', 'Gemini request failed', { cause: error });
}

function parseJson<T>(rawText: string, schema: z.ZodType<T>): T {
  let json: unknown;
  try {
    json = JSON.parse(rawText);
  } catch (error) {
    throw new AppError('AI_ERROR', 'Gemini returned invalid JSON', { cause: error });
  }

  const result = schema.safeParse(json);
  if (!result.success) {
    throw new AppError('AI_ERROR', `Gemini JSON failed validation: ${result.error.message}`);
  }
  return result.data;
}
