import { defineConfig } from '@playwright/test';
import base from './playwright.config';

/**
 * Backup demo video clips (showcase/3-video): the offline demo (scripts/demo.sh: in-memory demo data, recorded
 * real AI answers) recorded at phone size. Not part of CI:  npx playwright test -c playwright.showcase.config.ts
 * Then: python3 showcase/3-video/make_video.py (needs ffmpeg).
 */
export default defineConfig({
  ...base,
  testDir: 'showcase',
  timeout: 600_000,
  use: { ...base.use, actionTimeout: 30_000 },
  webServer: { command: '../scripts/demo.sh', url: 'http://localhost:4173', timeout: 300_000, reuseExistingServer: false, stdout: 'pipe' },
});
