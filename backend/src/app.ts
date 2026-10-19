import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { createDiagnoseRouter } from './routes/diagnose.routes.js';
import type { AiProvider } from './services/ai/aiProvider.js';

export interface AppDependencies {
  aiProvider: AiProvider;
  corsOrigins: string[];
}

export function createApp({ aiProvider, corsOrigins }: AppDependencies): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: corsOrigins, methods: ['GET', 'POST'] }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.use('/api', createDiagnoseRouter(aiProvider));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
