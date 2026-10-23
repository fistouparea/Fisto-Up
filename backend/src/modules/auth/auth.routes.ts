import express, { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { AUTH_RULES } from '../../config/marketRules.js';
import { AppError } from '../../errors/AppError.js';
import { createAuthController, type AuthControllerDeps } from './auth.controller.js';

function limiter({ windowMs, limit }: { windowMs: number; limit: number }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, _res, next) => next(new AppError('RATE_LIMITED')),
  });
}

export function createAuthRouter(deps: AuthControllerDeps): Router {
  const router = Router();
  const controller = createAuthController(deps);
  const json = express.json({ limit: '4kb' });

  router.post('/auth/register', limiter(AUTH_RULES.registerRateLimit), json, controller.register);
  router.post('/auth/login', limiter(AUTH_RULES.loginRateLimit), json, controller.login);
  router.post('/auth/logout', json, controller.logout);
  router.get('/auth/me', controller.me);
  return router;
}
