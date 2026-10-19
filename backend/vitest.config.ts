import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      GEMINI_API_KEY: 'test-key',
      GEMINI_MODEL: 'test-model',
      CORS_ORIGIN: 'http://localhost:5173',
    },
  },
});
