import cookieParser from 'cookie-parser';
import { Router } from 'express';
import type { MarketConfig } from '../config/env.js';
import { AppError } from '../errors/AppError.js';
import { createSessionMiddleware, requireAppHeader } from './auth/auth.middleware.js';
import { createAuthRouter } from './auth/auth.routes.js';
import { AuthService } from './auth/auth.service.js';
import { PinCredentials, type CredentialMethod } from './auth/credentials.js';
import { SessionTokens } from './auth/sessionToken.js';
import { createAccountRouter } from './sellers/seller.routes.js';

export interface MarketDependencies {
  config: MarketConfig;
  /** Tests pass a cheaper bcrypt cost. */
  credentials?: CredentialMethod;
  now?: () => Date;
}

/** Path prefixes that belong to the marketplace (accounts, listings, orders, admin). */
export const MARKET_PATHS = ['/auth', '/account', '/market', '/admin'];

/** Everything behind login: auth, profiles, listings, orders, coordinator panel. */
export function createMarketRouter({ config, credentials = new PinCredentials(), now }: MarketDependencies): Router {
  const auth = new AuthService(credentials, now);
  const tokens = new SessionTokens(config.jwtSecret);

  const router = Router();
  router.use(MARKET_PATHS, cookieParser(), requireAppHeader, createSessionMiddleware(auth, tokens));
  router.use(createAuthRouter({ auth, tokens, cookieSecure: config.cookieSecure }));
  router.use(createAccountRouter());
  return router;
}

/** Without MongoDB or JWT_SECRET the marketplace answers 503 and the advisor keeps working. */
export function createMarketUnavailableRouter(): Router {
  const router = Router();
  router.use(MARKET_PATHS, () => {
    throw new AppError('STORAGE_UNAVAILABLE', 'Marketplace is off (needs MONGO_URI and JWT_SECRET)');
  });
  return router;
}
