import { rateLimit } from 'express-rate-limit';
import { AppError } from '../errors/AppError.js';

/**
 * Protects the shared Gemini quota from a single client.
 * Kept generous because many rural mobile users share one public IP (carrier NAT).
 */
export const diagnoseRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, _res, next) => next(new AppError('RATE_LIMITED')),
});
