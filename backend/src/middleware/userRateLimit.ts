import type { RequestHandler } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { AppError } from '../errors/AppError.js';

/** Limit per logged-in account (falls back to the IP). Use after the auth middleware. */
export function createUserRateLimit({ windowMs, limit }: { windowMs: number; limit: number }): RequestHandler {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: (req) => (req.user ? `user:${req.user.id}` : ipKeyGenerator(req.ip ?? '')),
    handler: (_req, _res, next) => next(new AppError('RATE_LIMITED')),
  });
}
