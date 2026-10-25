import express, { Router } from 'express';
import { AUTH_RULES } from '../../config/marketRules.js';
import { createIpRateLimit as limiter } from '../../middleware/rateLimit.js';
import { createAuthController, type AuthControllerDeps } from './auth.controller.js';

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
