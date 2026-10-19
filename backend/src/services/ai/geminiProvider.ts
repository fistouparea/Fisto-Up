import { ApiError, GoogleGenAI, Type, type Schema } from '@google/genai';
import { AppError } from '../../errors/AppError.js';
import { aiDiagnosisSchema, type AiDiagnosis } from '../../types/diagnosis.js';
import type { AiProvider, DiagnoseInput } from './aiProvider.js';
import { buildUserPrompt, SYSTEM_PROMPT } from './prompt.js';
import { withRetry } from './retry.js';

/** HTTP statuses that mean "busy, try again later": rate limited or model overloaded. */
const BUSY_STATUSES = new Set([429, 503]);

/** Gemini-side schema for JSON mode. Mirrors aiDiagnosisSchema, which re-validates the result. */
const RESPONSE_SCHEMA: Schema = {
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
  },
  required: ['is_plant_image', 'confidence', 'problem_name', 'explanation', 'desi_upay', 'dawai', 'savdhani'],
  propertyOrdering: ['is_plant_image', 'confidence', 'problem_name', 'explanation', 'desi_upay', 'dawai', 'savdhani'],
};

export interface GeminiProviderOptions {
  apiKey: string;
  model: string;
  attemptTimeoutMs?: number;
  maxAttempts?: number;
  baseDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
  /** Injected in tests; defaults to the real Gemini client. */
  client?: Pick<GoogleGenAI, 'models'>;
}

export class GeminiProvider implements AiProvider {
  private readonly client: Pick<GoogleGenAI, 'models'>;
  private readonly model: string;
  private readonly attemptTimeoutMs: number;
  private readonly maxAttempts: number;
  private readonly baseDelayMs: number;
  private readonly sleep: ((ms: number) => Promise<void>) | undefined;

  constructor(options: GeminiProviderOptions) {
    this.client = options.client ?? new GoogleGenAI({ apiKey: options.apiKey });
    this.model = options.model;
    this.attemptTimeoutMs = options.attemptTimeoutMs ?? 30_000;
    this.maxAttempts = options.maxAttempts ?? 3;
    this.baseDelayMs = options.baseDelayMs ?? 1_000;
    this.sleep = options.sleep;
  }

  async diagnose(input: DiagnoseInput): Promise<AiDiagnosis> {
    let rawText: string;
    try {
      rawText = await withRetry(() => this.requestDiagnosis(input), {
        maxAttempts: this.maxAttempts,
        baseDelayMs: this.baseDelayMs,
        isRetryable: isBusyError,
        sleep: this.sleep,
      });
    } catch (error) {
      throw toAppError(error);
    }
    return parseDiagnosis(rawText);
  }

  private async requestDiagnosis({ image, mimeType, cropName }: DiagnoseInput): Promise<string> {
    const response = await this.client.models.generateContent({
      model: this.model,
      contents: [
        {
          role: 'user',
          parts: [{ inlineData: { mimeType, data: image.toString('base64') } }, { text: buildUserPrompt(cropName) }],
        },
      ],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.2,
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

function parseDiagnosis(rawText: string): AiDiagnosis {
  let json: unknown;
  try {
    json = JSON.parse(rawText);
  } catch (error) {
    throw new AppError('AI_ERROR', 'Gemini returned invalid JSON', { cause: error });
  }

  const result = aiDiagnosisSchema.safeParse(json);
  if (!result.success) {
    throw new AppError('AI_ERROR', `Gemini JSON failed validation: ${result.error.message}`);
  }
  return result.data;
}
