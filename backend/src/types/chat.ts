import { z } from 'zod';
import { cropIdSchema, diagnosisSchema } from './diagnosis.js';

/** Only the most recent messages are sent as context, to keep requests small and cheap. */
export const MAX_CHAT_MESSAGES = 10;
export const MAX_QUESTION_LENGTH = 500;
const MAX_ANSWER_LENGTH = 2000;

export const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  text: z.string().trim().min(1).max(MAX_ANSWER_LENGTH),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

export const ANSWER_LANGUAGES = ['hi', 'raj'] as const;
export type AnswerLanguage = (typeof ANSWER_LANGUAGES)[number];

/** Body of POST /api/chat. The last message is the farmer's new question. */
export const chatRequestSchema = z.object({
  /** "जवाब राजस्थानी में" (Phase 5). Default Hindi. */
  answerLanguage: z.enum(ANSWER_LANGUAGES).default('hi'),
  crop: cropIdSchema,
  diagnosis: diagnosisSchema,
  messages: z
    .array(chatMessageSchema)
    .min(1)
    .max(MAX_CHAT_MESSAGES)
    .refine((messages) => messages.at(-1)?.role === 'user', 'The last message must be the question')
    .refine(
      (messages) => (messages.at(-1)?.text.length ?? 0) <= MAX_QUESTION_LENGTH,
      `The question must be at most ${MAX_QUESTION_LENGTH} characters`,
    ),
});

/** Shape the AI model must return for a chat answer. */
export const aiChatAnswerSchema = z.object({
  answer: z.string().trim().min(1).max(MAX_ANSWER_LENGTH),
});

/** Response body of POST /api/chat. */
export interface ChatResponse {
  answer: string;
}
