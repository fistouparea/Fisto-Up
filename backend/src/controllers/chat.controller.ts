import type { RequestHandler, Response } from 'express';
import { AppError } from '../errors/AppError.js';
import type { AiProvider } from '../services/ai/aiProvider.js';
import { chatRequestSchema, type ChatResponse } from '../types/chat.js';
import { CROPS } from '../types/diagnosis.js';

export function createChatController(provider: AiProvider): RequestHandler {
  return async (req, res: Response<ChatResponse>) => {
    const body = chatRequestSchema.safeParse(req.body);
    if (!body.success) {
      throw new AppError('INVALID_INPUT', 'Invalid chat request');
    }

    const { crop, diagnosis, messages } = body.data;
    const answer = await provider.chat({ cropName: CROPS[crop], diagnosis, messages });
    res.json({ answer });
  };
}
