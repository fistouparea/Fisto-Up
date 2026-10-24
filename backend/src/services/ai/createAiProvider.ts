import type { Env } from '../../config/env.js';
import type { AiProvider } from './aiProvider.js';
import { GeminiProvider } from './geminiProvider.js';

/** The one place that decides which AI provider the app uses (set AI_PROVIDER in .env). */
export function createAiProvider(env: Env): AiProvider {
  switch (env.AI_PROVIDER) {
    case 'gemini':
      return new GeminiProvider({
        apiKey: env.GEMINI_API_KEY,
        model: env.GEMINI_MODEL,
        fallbackModels: env.GEMINI_FALLBACK_MODELS,
        ...(env.GEMINI_ATTEMPT_TIMEOUT_SECONDS && { attemptTimeoutMs: env.GEMINI_ATTEMPT_TIMEOUT_SECONDS * 1000 }),
        thinkingLevel: env.GEMINI_THINKING_LEVEL,
      });
  }
}
