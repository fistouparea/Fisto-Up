/**
 * Prints every Launch Kit HTML page to an A4 PDF next to it (Chromium from the frontend's Playwright).
 *   cd frontend && npm run launch-kit:pdf
 */
import { createRequire } from 'node:module';
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const kit = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(kit, '../frontend/package.json'));
const { chromium } = require('@playwright/test');

const pages = [];
for (const dir of readdirSync(kit)) {
  const full = path.join(kit, dir);
  if (!statSync(full).isDirectory() || dir === 'assets') continue;
  for (const file of readdirSync(full)) if (file.endsWith('.html')) pages.push(path.join(full, file));
}

const browser = await chromium.launch();
const page = await browser.newPage();
for (const html of pages.sort()) {
  await page.goto(pathToFileURL(html).href, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const pdf = html.replace(/\.html$/, '.pdf');
  const landscape = (await page.evaluate(() => document.body.dataset.orientation)) === 'landscape';
  await page.pdf({ path: pdf, format: 'A4', landscape, printBackground: true, preferCSSPageSize: true });
  console.log('PDF', path.relative(kit, pdf));
}
await browser.close();
