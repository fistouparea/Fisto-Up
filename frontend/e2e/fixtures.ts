import { expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { CONSENT_VERSION } from '../src/data/consentVersion';
import { hi } from '../src/strings/hi';

export { hi };

/** Demo accounts from backend/src/scripts/seed.ts (+ seedPhase5.ts). Every PIN is 2580. */
export const PHONES = {
  coordinator: '9000000001',
  ramesh: '9000000101',
  dealer: '9000000106',
  hotel: '9000000201',
  household: '9000000202',
  worker: '9000000203',
} as const;
export const DEMO_PIN = '2580';

/** What the E2E backend's fake AI answers (backend/e2e/server.ts). */
export const E2E_AI = { problem: 'पत्तों पर झुलसा रोग (E2E)', chatAnswer: 'शाम के समय छिड़काव करें। (E2E)' };
/** The Snap & List draft the fake AI returns (backend/tests/helpers.ts bajraListingDraft). */
export const SNAP_LIST_TITLE = 'साफ़ बाजरा – 10 क्विंटल';

export const CROP_PHOTO = fileURLToPath(new URL('./crop-photo.jpg', import.meta.url));

/**
 * A new phone that already agreed to the privacy notice (the consent screen has its own test).
 * The service worker is off (see playwright.config.ts) unless `serviceWorkers: 'allow'` (the offline journey).
 */
export async function newPhone(browser: Browser, { serviceWorkers = 'block' }: { serviceWorkers?: 'allow' | 'block' } = {}): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ serviceWorkers });
  await context.addInitScript((version) => {
    localStorage.setItem('agriai.consent.accepted', version);
  }, CONSENT_VERSION);
  return { context, page: await context.newPage() };
}

export async function login(page: Page, phone: string): Promise<void> {
  await page.goto('/#/login');
  await page.getByLabel(hi.auth.phone).fill(phone);
  await page.getByLabel(hi.auth.pin).fill(DEMO_PIN);
  await page.getByRole('button', { name: hi.auth.login, exact: true }).click();
  // Logging in on a phone other than the account's own phone adopts the account's phone id and reloads the app
  // (AuthProvider.setUser). The app bar shows the account only once that is done, so later navigation sticks.
  await expect(page.getByRole('link', { name: new RegExp(`^${hi.account.open}:`) })).toBeVisible();
  await expect(page).not.toHaveURL(/#\/login$/);
  await page.waitForLoadState('networkidle');
}

/**
 * The seller's "नया ऑर्डर आया!" alert (for orders from the seed) can pop up over any screen: tests close it
 * with "बाद में" whenever it appears, like a seller who will look later.
 */
export async function closeOrderAlerts(page: Page): Promise<void> {
  await page.addLocatorHandler(page.getByRole('dialog', { name: /नया ऑर्डर|भाव पूछा/ }), async (dialog) => {
    await dialog.getByRole('button', { name: hi.orders.later }).click();
  });
}

/** Phone that is logged in as `phone`. */
export async function loggedIn(browser: Browser, phone: string): Promise<{ context: BrowserContext; page: Page }> {
  const phoneSession = await newPhone(browser);
  await closeOrderAlerts(phoneSession.page);
  await login(phoneSession.page, phone);
  return phoneSession;
}

/** The photo pickers are hidden inputs behind big buttons; the first one is the camera. */
export async function pickPhoto(page: Page): Promise<void> {
  await page.locator('input[type=file]').first().setInputFiles(CROP_PHOTO);
}

/**
 * Opens a screen with fresh data. A page already showing the same `#/…` screen would not reload on goto (only
 * the hash is the same), and screens refresh on their own only every 30 s.
 */
export async function openFresh(page: Page, hash: string): Promise<void> {
  await page.goto(`/${hash}`);
  await page.reload();
}

/** Order id from an order page URL (#/orders/<id>). */
export function orderIdFrom(page: Page): string {
  const id = new URL(page.url()).hash.split('/')[2];
  if (!id) throw new Error(`not an order page: ${page.url()}`);
  return decodeURIComponent(id);
}
