import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: ['tests/setup/mongoReplSet.ts'],
    // Starting the replica set downloads MongoDB once (cached in ~/.cache/mongodb-binaries).
    hookTimeout: 60_000,
    // Marketplace tests run many real MongoDB transactions in parallel; 5 s was too tight once the suite grew
    // (failures were timeouts only, never wrong results). Assertions are unchanged.
    testTimeout: 20_000,
    env: {
      GEMINI_API_KEY: 'test-key',
      GEMINI_MODEL: 'test-model',
      CORS_ORIGIN: 'http://localhost:5173',
    },
  },
});
