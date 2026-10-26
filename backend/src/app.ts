import cors from 'cors';
import express, { type Express, type RequestHandler } from 'express';
import helmet from 'helmet';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { createAiRateLimit, createApiRateLimits } from './middleware/rateLimit.js';
import { API_CSP_DIRECTIVES } from './config/securityRules.js';
import type { ReadinessCheck } from './observability/health.js';
import { createRequestLogger } from './observability/requestLogger.js';
import { createChatRouter } from './routes/chat.routes.js';
import { createDiagnoseRouter } from './routes/diagnose.routes.js';
import { createHistoryRouter } from './routes/history.routes.js';
import { createProfileRouter } from './routes/profile.routes.js';
import { createFarmAdviceRouter } from './routes/farmAdvice.routes.js';
import { createPushRouter } from './routes/push.routes.js';
import { createConsentRouter } from './modules/privacy/privacy.routes.js';
import { createMarketRouter, createMarketUnavailableRouter, type MarketDependencies } from './modules/marketRouter.js';
import type { AiProvider } from './services/ai/aiProvider.js';
import type { FarmProfileRepository } from './services/farm/farmProfileRepository.js';
import type { HistoryRepository } from './services/history/historyRepository.js';
import type { MandiProvider } from './services/mandi/agmarknetProvider.js';
import type { PushSubscriptionRepository } from './services/push/pushSubscriptionRepository.js';
import type { WeatherProvider } from './services/weather/weatherProvider.js';

export interface AppDependencies {
  aiProvider: AiProvider;
  /** null when MONGO_URI is not set: diagnosis works, history endpoints return HISTORY_UNAVAILABLE. */
  historyRepository: HistoryRepository | null;
  /** null when MONGO_URI is not set: "मेरा खेत" endpoints return STORAGE_UNAVAILABLE. */
  farmProfiles?: FarmProfileRepository | null;
  weather?: WeatherProvider | null;
  /** Mandi prices (optional, needs DATA_GOV_API_KEY). */
  mandi?: MandiProvider | null;
  /** Web push: public VAPID key (null = push off) and subscription storage. */
  push?: { publicKey: string | null; subscriptions: PushSubscriptionRepository | null };
  /** Marketplace (accounts, listings, orders). null/undefined = off, its endpoints answer 503. */
  market?: MarketDependencies | null;
  corsOrigins: string[];
  /** Reverse proxies in front of the app; 0 when clients connect directly. */
  trustProxyHops?: number;
  /** Consent records need MongoDB. Default: on when the farm profile store is (tests turn it on explicitly). */
  consentStorage?: boolean;
  /** GET /ready: are the database and the server ready for traffic? Default: always ready (tests). */
  readiness?: ReadinessCheck;
}

export function createApp({
  aiProvider,
  historyRepository,
  farmProfiles = null,
  weather = null,
  mandi = null,
  push = { publicKey: null, subscriptions: null },
  market = null,
  corsOrigins,
  trustProxyHops = 0,
  readiness = async () => ({ status: 'ok', checks: {} }),
  consentStorage = farmProfiles !== null || market !== null,
}: AppDependencies): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', trustProxyHops);
  app.use(createRequestLogger());
  app.use(helmet({ contentSecurityPolicy: { useDefaults: false, directives: API_CSP_DIRECTIVES } }));
  // Only our own frontend origin(s) from CORS_ORIGIN. credentials: the login cookie, when the API runs on
  // another domain (VITE_API_BASE_URL). Other origins get no CORS headers, so browsers block their reads.
  app.use(cors({ origin: corsOrigins, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], credentials: true, maxAge: 600 }));

  // Liveness: the process answers. Readiness: it can serve traffic (database reachable, not shutting down).
  // Not rate limited, so a busy hour never makes the platform think the app is dead.
  const live: RequestHandler = (_req, res) => {
    res.set('Cache-Control', 'no-store').json({ status: 'ok' });
  };
  app.get(['/health', '/api/health'], live);
  app.get(['/ready', '/api/ready'], async (_req, res) => {
    const report = await readiness();
    res.status(report.status === 'ok' ? 200 : 503).set('Cache-Control', 'no-store').json(report);
  });

  app.use('/api', createApiRateLimits());

  const aiRateLimit = createAiRateLimit();
  app.use('/api', createDiagnoseRouter(aiProvider, historyRepository, aiRateLimit));
  app.use('/api', createChatRouter(aiProvider, aiRateLimit));
  app.use('/api', createHistoryRouter(historyRepository));
  app.use('/api', createProfileRouter(farmProfiles));
  app.use('/api', createFarmAdviceRouter({ farmProfiles, history: historyRepository, weather }, mandi));
  app.use('/api', createPushRouter(push.publicKey, push.subscriptions));
  app.use('/api', createConsentRouter(consentStorage));
  app.use('/api', market ? createMarketRouter(market, { ai: aiProvider, aiRateLimit, mandi }) : createMarketUnavailableRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
