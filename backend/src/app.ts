import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { createAiRateLimit } from './middleware/rateLimit.js';
import { createChatRouter } from './routes/chat.routes.js';
import { createDiagnoseRouter } from './routes/diagnose.routes.js';
import { createHistoryRouter } from './routes/history.routes.js';
import type { AiProvider } from './services/ai/aiProvider.js';
import type { HistoryRepository } from './services/history/historyRepository.js';

export interface AppDependencies {
  aiProvider: AiProvider;
  /** null when MONGO_URI is not set: diagnosis works, history endpoints return HISTORY_UNAVAILABLE. */
  historyRepository: HistoryRepository | null;
  corsOrigins: string[];
  /** Reverse proxies in front of the app; 0 when clients connect directly. */
  trustProxyHops?: number;
}

export function createApp({
  aiProvider,
  historyRepository,
  corsOrigins,
  trustProxyHops = 0,
}: AppDependencies): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', trustProxyHops);
  app.use(helmet());
  app.use(cors({ origin: corsOrigins, methods: ['GET', 'POST'] }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  const aiRateLimit = createAiRateLimit();
  app.use('/api', createDiagnoseRouter(aiProvider, historyRepository, aiRateLimit));
  app.use('/api', createChatRouter(aiProvider, aiRateLimit));
  app.use('/api', createHistoryRouter(historyRepository));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
