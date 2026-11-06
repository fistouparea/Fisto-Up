import { expect, test, type Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { cropLabels } from '../src/strings/hi';
import { hiAdmin } from '../src/strings/hiAdmin';
import { hiF } from '../src/strings/hiFeatures';
import { closeOrderAlerts, hi, loggedIn, newPhone, PHONES, pickPhoto } from '../e2e/fixtures';

/**
 * Phone-screen pictures for the printed Launch Kit guides (launch-kit/assets/shots): what the farmer or the
 * coordinator sees, one screen at a time, sharp enough for A4.  npx playwright test -c playwright.screens.config.ts launchKit
 */
const OUT = fileURLToPath(new URL('../../launch-kit/assets/shots/', import.meta.url));
test.use({ deviceScaleFactor: 2 });

async function shot(page: Page, name: string, fullPage = false): Promise<void> {
  await page.waitForLoadState('networkidle');
  // No toast (such as "जाँच पूरी हुई") covering the screen: they close on their own after 4 s.
  await page.waitForFunction(() => document.querySelectorAll('[data-rht-toaster] [role="status"]').length === 0, undefined, { timeout: 10_000 });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}${name}.png`, fullPage });
}

test('launch kit pictures', async ({ browser }) => {
  test.setTimeout(600_000);
  // Farmer (अनीता, farm in Ratangarh): home, photo check, weather, water, voice, mandi trip.
  const farmer = await loggedIn(browser, PHONES.household);
  await farmer.page.emulateMedia({ reducedMotion: 'reduce' });
  await farmer.page.goto('/#/');
  await shot(farmer.page, 'f-home');
  await farmer.page.mouse.wheel(0, 900);
  await shot(farmer.page, 'f-home-more');
  await farmer.page.goto('/#/check');
  await shot(farmer.page, 'f-check-crops');
  await farmer.page.getByRole('group', { name: hi.steps.crop }).getByRole('button', { name: new RegExp(`^${cropLabels.bajra.hindi}`) }).click();
  await shot(farmer.page, 'f-check-camera');
  await pickPhoto(farmer.page);
  await expect(farmer.page.getByRole('button', { name: hi.checkPhoto, exact: true })).toBeVisible();
  await shot(farmer.page, 'f-check-preview');
  await farmer.page.getByRole('button', { name: hi.checkPhoto, exact: true }).click();
  await expect(farmer.page.getByText(hi.sections.problem).first()).toBeVisible();
  await shot(farmer.page, 'f-check-result');
  await farmer.page.getByRole('heading', { name: hi.kit.title }).scrollIntoViewIfNeeded();
  await shot(farmer.page, 'f-check-kit');
  await farmer.page.goto('/#/weather');
  await shot(farmer.page, 'f-weather');
  await farmer.page.goto('/#/water');
  await shot(farmer.page, 'f-water');
  await farmer.page.goto('/#/settings');
  await shot(farmer.page, 'f-settings');
  await farmer.page.goto('/#/mandi-trips');
  await shot(farmer.page, 'f-mandi');

  // Seller (रमेश): बेचें with photo + voice.
  const seller = await loggedIn(browser, PHONES.ramesh);
  await closeOrderAlerts(seller.page);
  await seller.page.goto('/#/sell/new');
  await shot(seller.page, 's-sell-photo');
  await pickPhoto(seller.page);
  await shot(seller.page, 's-sell-speak');
  await seller.page.locator('#sell-text').fill('दस क्विंटल बाजरा, पच्चीस सौ रुपये क्विंटल');
  await seller.page.getByRole('main').getByRole('button', { name: hi.sell.next, exact: true }).click();
  await expect(seller.page.getByRole('button', { name: hi.sell.confirm, exact: true })).toBeVisible();
  await shot(seller.page, 's-sell-confirm');

  // Coordinator panel tabs for the training manual.
  const coordinator = await loggedIn(browser, PHONES.coordinator);
  await closeOrderAlerts(coordinator.page);
  for (const tab of ['overview', 'sellers', 'newListing', 'orders', 'complaints', 'trips', 'ledger', 'pilot', 'invites', 'services', 'flags'] as const) {
    await coordinator.page.goto(tab === 'overview' ? '/#/admin' : `/#/admin/${tab}`);
    await shot(coordinator.page, `c-${tab}`);
  }
});

test('launch kit delivery pictures', async ({ browser }) => {
  test.setTimeout(600_000);
  const coordinator = await loggedIn(browser, PHONES.coordinator);
  await closeOrderAlerts(coordinator.page);
  // Orders: the delivery person + link controls of one delivery order.
  await coordinator.page.goto('/#/admin/orders');
  const assign = coordinator.page.getByText(hiAdmin.assignDelivery).first();
  if (await assign.isVisible()) await assign.scrollIntoViewIfNeeded();
  await shot(coordinator.page, 'c-orders-delivery');
  // A delivery person's page (no login) for a seeded "out for delivery" order.
  const orders = (await (await coordinator.context.request.get('/api/admin/orders')).json()) as { items: { id: string; status: string; fulfilment: string }[] };
  const onTheWay = orders.items.find((order) => order.fulfilment === 'delivery' && order.status === 'out_for_delivery');
  if (onTheWay) {
    const link = (await (await coordinator.context.request.post(`/api/admin/orders/${onTheWay.id}/delivery-link`, { headers: { 'X-Requested-With': 'agriai' }, data: {} })).json()) as { token: string };
    const phone = await newPhone(browser);
    await phone.page.goto(`/#/delivery/${link.token}`);
    await shot(phone.page, 'd-delivery');
  }
  await coordinator.page.goto('/#/admin/complaints');
  await expect(coordinator.page.getByText(hiF.complaints.admin.take).first()).toBeVisible();
  await shot(coordinator.page, 'c-complaint-detail');
});
