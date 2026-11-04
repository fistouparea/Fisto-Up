import { defineConfig } from '@playwright/test';
import base from './playwright.config';

/**
 * 360 px screenshots of the Phase 5/6 screens into docs/screenshots (p6-*.png), for review. Same servers as
 * the E2E journeys. Not part of CI:  npx playwright test -c playwright.screens.config.ts
 */
export default defineConfig({ ...base, testDir: 'screens', timeout: 300_000 });
