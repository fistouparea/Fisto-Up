import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { AppError } from '../errors/AppError.js';

/**
 * One limiter shared by all AI endpoints (diagnose + chat), protecting the shared Gemini quota.
 * Kept generous because many rural mobile users share one public IP (carrier NAT).
 */
export function createAiRateLimit(): RequestHandler {
  return rateLimit({
    windowMs: 60_000,
    limit: 30,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, _res, next) => next(new AppError('RATE_LIMITED')),
  });
}
