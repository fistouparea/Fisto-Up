import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: ['tests/setup/mongoReplSet.ts'],
    // Starting the replica set downloads MongoDB once (cached in ~/.cache/mongodb-binaries).
    hookTimeout: 60_000,
    env: {
      GEMINI_API_KEY: 'test-key',
      GEMINI_MODEL: 'test-model',
      CORS_ORIGIN: 'http://localhost:5173',
    },
  },
});
