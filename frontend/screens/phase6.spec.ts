import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { cropLabels } from '../src/strings/hi';
import { closeOrderAlerts, hi, loggedIn, newPhone, PHONES, pickPhoto } from '../e2e/fixtures';

const OUT = fileURLToPath(new URL('../../docs/screenshots/', import.meta.url));
let counter = 0;

/** Full-page 360 px screenshot after the screen has settled (no spinners, no toasts). */
async function shot(page: Page, name: string): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);
  counter += 1;
  await page.screenshot({ path: `${OUT}p6-${String(counter).padStart(2, '0')}-${name}.png`, fullPage: true });
}

const json = async <T>(request: APIRequestContext, url: string): Promise<T> => (await (await request.get(url)).json()) as T;
const write = { 'X-Requested-With': 'agriai' };

test('Phase 5/6 screens', async ({ browser }) => {
  // --- Farmer without account ---
  const guest = await newPhone(browser);
  // The home screen itself, not the one-time farm setup (that screen has its own Phase 2 screenshots).
  await guest.page.addInitScript(() => localStorage.setItem('agriai.flag.onboardingDone', '1'));
  await guest.page.goto('/#/');
  await shot(guest.page, 'home-more-services');
  await guest.page.goto('/#/settings');
  await shot(guest.page, 'settings');
  await guest.page.getByRole('radio', { name: /राजस्थानी/ }).click();
  await guest.page.goto('/#/');
  await shot(guest.page, 'home-rajasthani');
  await guest.page.goto('/#/settings');
  await guest.page.getByRole('radio', { name: /हिंदी/ }).click();
  await guest.page.goto('/#/schemes');
  await shot(guest.page, 'schemes');
  await guest.page.goto('/#/check');
  await guest.page.getByRole('group', { name: hi.steps.crop }).getByRole('button', { name: new RegExp(`^${cropLabels.bajra.hindi}`) }).click();
  await pickPhoto(guest.page);
  await guest.page.getByRole('button', { name: hi.checkPhoto, exact: true }).click();
  await expect(guest.page.getByRole('heading', { name: hi.kit.title })).toBeVisible();
  await guest.page.getByRole('heading', { name: hi.kit.title }).scrollIntoViewIfNeeded();
  await shot(guest.page, 'diagnosis-ai-kit');
  await guest.page.goto('/#/market');
  await guest.page.getByRole('button', { name: hi.market.inputs }).click();
  await shot(guest.page, 'market-inputs');
  await guest.page.goto('/#/services/equipment');
  await shot(guest.page, 'equipment-list');
  await guest.page.goto('/#/services/livestock');
  await shot(guest.page, 'livestock-list');
  await guest.page.goto('/#/services/labour/need');
  await shot(guest.page, 'labour-needs');
  await guest.page.goto('/#/mandi-trips');
  await shot(guest.page, 'mandi-trips-guest');
  await guest.page.goto('/#/services/item/000000000000000000000000');
  await shot(guest.page, 'service-not-found');
  await guest.page.goto('/#/delivery/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
  await shot(guest.page, 'delivery-link-invalid');
  // Offline needs the service worker (blocked for the other phones, see playwright.config.ts).
  const offline = await newPhone(browser, { serviceWorkers: 'allow' });
  await offline.page.goto('/#/schemes');
  await offline.page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await offline.page.reload();
  await offline.context.setOffline(true);
  await offline.page.reload();
  await shot(offline.page, 'schemes-offline');
  await offline.context.setOffline(false);

  // --- Household farmer (account, farm in Ratangarh) ---
  const farmer = await loggedIn(browser, PHONES.household);
  await farmer.page.goto('/#/services/equipment');
  await shot(farmer.page, 'equipment-none-nearby');
  await farmer.page.getByRole('button', { name: hi.services.lookEverywhere }).click();
  await farmer.page.getByRole('link', { name: /महिंद्रा 575 ट्रैक्टर/ }).click();
  await shot(farmer.page, 'equipment-detail-booking');
  await farmer.page.goto('/#/services/my');
  await shot(farmer.page, 'my-services-bookings');
  const bookings = await json<{ items: { id: string; status: string }[] }>(farmer.context.request, '/api/services/bookings');
  const accepted = bookings.items.find((item) => item.status === 'accepted');
  if (accepted) {
    await farmer.page.goto(`/#/services/booking/${accepted.id}`);
    await shot(farmer.page, 'booking-accepted-phone');
  }
  await farmer.page.goto('/#/services/new/equipment/offer');
  await shot(farmer.page, 'new-machine-form');
  await farmer.page.goto('/#/services/new/labour/need');
  await shot(farmer.page, 'new-work-need-form');
  await farmer.page.goto('/#/services/new/livestock/offer');
  await shot(farmer.page, 'new-animal-form');
  await farmer.page.goto('/#/mandi-trips');
  await shot(farmer.page, 'mandi-trips-joined');
  await farmer.page.goto('/#/complaints');
  await shot(farmer.page, 'my-complaints');
  const complaints = await json<{ items: { id: string }[] }>(farmer.context.request, '/api/complaints');
  if (complaints.items[0]) {
    await farmer.page.goto(`/#/complaints/${complaints.items[0].id}`);
    await shot(farmer.page, 'complaint-thread');
  }
  await farmer.page.goto('/#/market');
  await farmer.page.getByRole('link', { name: /हरा मूंग/ }).first().click();
  await farmer.page.getByRole('button', { name: hi.complaints.raise }).click();
  await shot(farmer.page, 'complaint-form');

  // --- Worker: labour matches ---
  const worker = await loggedIn(browser, PHONES.worker);
  const own = await json<{ items: { id: string }[] }>(worker.context.request, '/api/services/my');
  if (own.items[0]) {
    await worker.page.goto(`/#/services/item/${own.items[0].id}`);
    await shot(worker.page, 'labour-own-with-matches');
  }

  // --- Owner: incoming booking with big हाँ / ना ---
  const owner = await loggedIn(browser, PHONES.ramesh);
  const incoming = await json<{ items: { id: string; status: string; viewerRole: string }[] }>(owner.context.request, '/api/services/bookings');
  const waiting = incoming.items.find((item) => item.status === 'requested' && item.viewerRole === 'owner');
  if (waiting) {
    await owner.page.goto(`/#/services/booking/${waiting.id}`);
    await shot(owner.page, 'booking-owner-yes-no');
  }

  // --- Input dealer ---
  const dealer = await loggedIn(browser, PHONES.dealer);
  await dealer.page.goto('/#/account/seller');
  await shot(dealer.page, 'dealer-profile-licence');
  await dealer.page.goto('/#/sell/new');
  await pickPhoto(dealer.page);
  await expect(dealer.page.getByText(hi.sell.inputs)).toBeVisible();
  await shot(dealer.page, 'dealer-new-listing');

  // --- Coordinator ---
  const coordinator = await loggedIn(browser, PHONES.coordinator);
  await closeOrderAlerts(coordinator.page);
  for (const [tab, name] of [
    ['sellers', 'admin-sellers-licence'],
    ['services', 'admin-approvals'],
    ['schemes', 'admin-schemes'],
    ['trips', 'admin-mandi-trips'],
    ['complaints', 'admin-complaints'],
    ['ledger', 'admin-ledger-referrals'],
  ] as const) {
    await coordinator.page.goto(`/#/admin/${tab}`);
    await shot(coordinator.page, name);
  }

  // --- Delivery: a link for a seeded delivery order, the page, and the buyer's timeline ---
  const orders = await json<{ items: { id: string; status: string; fulfilment: string; deliveryPerson?: unknown }[] }>(coordinator.context.request, '/api/admin/orders');
  const onTheWay = orders.items.find((order) => order.fulfilment === 'delivery' && order.status === 'out_for_delivery');
  if (onTheWay) {
    const link = await coordinator.context.request.post(`/api/admin/orders/${onTheWay.id}/delivery-link`, { headers: write, data: {} });
    const { token } = (await link.json()) as { token: string };
    const deliveryPhone = await browser.newContext({ serviceWorkers: 'block' });
    const delivery = await deliveryPhone.newPage();
    await delivery.goto(`/#/delivery/${token}`);
    await shot(delivery, 'delivery-page');
    await delivery.getByRole('button', { name: hi.delivery.buttons.picked, exact: true }).click();
    await delivery.getByRole('button', { name: hi.delivery.buttons.on_the_way, exact: true }).click();
    await shot(delivery, 'delivery-on-the-way');
    await coordinator.page.goto(`/#/orders/${onTheWay.id}`);
    await shot(coordinator.page, 'order-delivery-timeline');
  }
});
