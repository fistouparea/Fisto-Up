import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { RATE_LIMITS } from '../config/securityRules.js';
import { AppError } from '../errors/AppError.js';

export interface RateRule {
  windowMs: number;
  limit: number;
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Per-IP limit answering 429 RATE_LIMITED. Each call has its own counter. */
export function createIpRateLimit({ windowMs, limit }: RateRule, options: { writesOnly?: boolean } = {}): RequestHandler {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    ...(options.writesOnly && { skip: (req) => SAFE_METHODS.has(req.method) }),
    handler: (_req, _res, next) => next(new AppError('RATE_LIMITED')),
  });
}

/**
 * One limiter shared by all AI endpoints (diagnose, chat, Snap & List, price estimate), protecting the shared
 * Gemini quota. Kept generous because many rural mobile users share one public IP (carrier NAT).
 */
export function createAiRateLimit(): RequestHandler {
  return createIpRateLimit(RATE_LIMITS.ai);
}

/** All /api traffic, plus a tighter limit for writes. Route-specific limits (login, AI, orders) come on top. */
export function createApiRateLimits(): RequestHandler[] {
  return [createIpRateLimit(RATE_LIMITS.api), createIpRateLimit(RATE_LIMITS.writes, { writesOnly: true })];
}
