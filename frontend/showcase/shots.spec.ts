import { expect, test, type Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { cropLabels } from '../src/strings/hi';
import { hiF } from '../src/strings/hiFeatures';
import { hi, loggedIn, newPhone, PHONES } from '../e2e/fixtures';

/**
 * Phone screenshots for the Showcase Kit (brief, deck), taken on the offline demo: demo data and REAL AI
 * answers recorded earlier (backend/demo/recordings.json). → showcase/assets/shots/
 *   npx playwright test -c playwright.showcase.config.ts shots
 */
const OUT = fileURLToPath(new URL('../../showcase/assets/shots/', import.meta.url));
const PHOTOS = fileURLToPath(new URL('../../backend/demo/photos/', import.meta.url));
const SEED = fileURLToPath(new URL('../../backend/seed-assets/', import.meta.url));
test.use({ deviceScaleFactor: 2 });

async function shot(page: Page, name: string): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => document.querySelectorAll('[data-rht-toaster] [role="status"]').length === 0, undefined, { timeout: 10_000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}${name}.png` });
}

test('showcase screenshots', async ({ browser }) => {
  test.setTimeout(600_000);
  // Consent screen of a brand-new phone (no consent stored yet).
  const fresh = await browser.newContext({ serviceWorkers: 'block' });
  const freshPage = await fresh.newPage();
  await freshPage.goto('/');
  await expect(freshPage.getByRole('button', { name: hi.consent.agree })).toBeVisible();
  await shot(freshPage, 'consent');
  await fresh.close();

  const farmer = await loggedIn(browser, PHONES.household);
  const f = farmer.page;
  await f.goto('/#/');
  await shot(f, 'home');
  await f.goto('/#/check');
  await f.getByRole('group', { name: hi.steps.crop }).getByRole('button', { name: new RegExp(`^${cropLabels.sarson.hindi}`) }).click();
  await f.locator('input[type=file]').first().setInputFiles(`${PHOTOS}sarson-aphid.jpg`);
  await shot(f, 'check-photo');
  await f.getByRole('button', { name: hi.checkPhoto, exact: true }).click();
  await expect(f.getByText(hi.sections.problem).first()).toBeVisible();
  await shot(f, 'result-top');
  await f.getByRole('heading', { name: hi.sections.problem }).first().evaluate((element) => element.scrollIntoView({ block: 'start' }));
  await f.mouse.wheel(0, -90);
  await shot(f, 'result-problem');
  await f.getByText(hi.dawaiWarning).first().scrollIntoViewIfNeeded();
  await f.mouse.wheel(0, -220);
  await shot(f, 'result-dawai');
  await f.getByText(hi.kvkAdvice).first().scrollIntoViewIfNeeded();
  await shot(f, 'result-kvk');
  await f.getByRole('button', { name: hi.newCheck, exact: true }).click();
  await f.getByRole('group', { name: hi.steps.crop }).getByRole('button', { name: new RegExp(`^${cropLabels.bajra.hindi}`) }).click();
  await f.locator('input[type=file]').first().setInputFiles(`${SEED}handicraft.jpg`);
  await f.getByRole('button', { name: hi.checkPhoto, exact: true }).click();
  await expect(f.getByText(hi.unclearPhoto).first()).toBeVisible();
  await shot(f, 'unclear');
  for (const [route, name] of [
    ['/#/weather', 'weather'],
    ['/#/water', 'water'],
    ['/#/schemes', 'schemes'],
    ['/#/services/equipment', 'rental'],
    ['/#/mandi-trips', 'mandi-trips'],
    ['/#/my-data', 'my-data'],
  ] as const) {
    await f.goto(route);
    await shot(f, name);
  }

  const seller = await loggedIn(browser, PHONES.ramesh);
  const s = seller.page;
  await s.goto('/#/sell/new');
  await s.locator('input[type=file]').first().setInputFiles(`${SEED}bajra.jpg`);
  await s.locator('#sell-text').fill('दस क्विंटल बाजरा, पच्चीस सौ रुपये क्विंटल');
  await s.getByRole('main').getByRole('button', { name: hi.sell.next, exact: true }).click();
  await expect(s.getByRole('main').getByRole('button', { name: hi.sell.confirm, exact: true })).toBeVisible();
  await shot(s, 'sell-ai-draft');
  await s.goto('/#/market');
  await shot(s, 'market');

  const coordinator = await loggedIn(browser, PHONES.coordinator);
  const c = coordinator.page;
  for (const [route, name] of [
    ['/#/admin', 'admin-overview'],
    ['/#/admin/pilot', 'admin-pilot'],
    ['/#/admin/complaints', 'admin-complaints'],
    ['/#/admin/sellers', 'admin-sellers'],
  ] as const) {
    await c.goto(route);
    await shot(c, name);
  }
  // A delivery person's page for a seeded order that is out for delivery.
  const orders = (await (await c.context().request.get('/api/admin/orders')).json()) as { items: { id: string; status: string; fulfilment: string }[] };
  const onTheWay = orders.items.find((order) => order.fulfilment === 'delivery' && order.status === 'out_for_delivery');
  if (onTheWay) {
    const link = (await (await c.context().request.post(`/api/admin/orders/${onTheWay.id}/delivery-link`, { headers: { 'X-Requested-With': 'agriai' }, data: {} })).json()) as { token: string };
    const phone = await newPhone(browser);
    await phone.page.goto(`/#/delivery/${link.token}`);
    await expect(phone.page.getByRole('button', { name: hiF.delivery.buttons.picked, exact: true })).toBeVisible();
    await shot(phone.page, 'delivery');
  }
});
