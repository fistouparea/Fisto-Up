import { createApp } from './app.js';
import { loadEnv } from './config/env.js';
import { createAiProvider } from './services/ai/createAiProvider.js';

const env = loadEnv();
const app = createApp({ aiProvider: createAiProvider(env), corsOrigins: env.CORS_ORIGIN });

app.listen(env.PORT, () => {
  console.log(`AgriAI backend running on http://localhost:${env.PORT}`);
});
