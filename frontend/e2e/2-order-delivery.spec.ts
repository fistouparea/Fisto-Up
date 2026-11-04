import { expect, test, type Page } from '@playwright/test';
import { hi, loggedIn, openFresh, orderIdFrom, PHONES, pickPhoto, SNAP_LIST_TITLE } from './fixtures';

const action = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

test('Snap & List → order → accept → delivery tracking → paid → completed → rating', async ({ browser }) => {
  // Seller lists with a photo and spoken words; the (fake) AI fills the form.
  const seller = await loggedIn(browser, PHONES.ramesh);
  await seller.page.goto('/#/sell/new');
  await pickPhoto(seller.page);
  await seller.page.locator('#sell-text').fill('दस क्विंटल बाजरा, पच्चीस सौ रुपये क्विंटल');
  await action(seller.page, hi.sell.next).click();
  await action(seller.page, hi.sell.confirm).click();
  await expect(seller.page.getByText(hi.sell.doneTitle).first()).toBeVisible();

  // Buyer finds it and orders home delivery.
  const buyer = await loggedIn(browser, PHONES.hotel);
  await buyer.page.goto('/#/market');
  await buyer.page.getByPlaceholder(hi.market.searchPlaceholder).fill('साफ़ बाजरा');
  await buyer.page.getByPlaceholder(hi.market.searchPlaceholder).press('Enter');
  await buyer.page.getByRole('link', { name: new RegExp(SNAP_LIST_TITLE) }).first().click();
  await action(buyer.page, hi.orders.placeTitle).click();
  await buyer.page.getByRole('button', { name: hi.orders.delivery }).click();
  await buyer.page.getByLabel(hi.orders.address).fill('स्टेशन रोड, चूरू');
  await action(buyer.page, hi.orders.send).click();
  await expect(buyer.page).toHaveURL(/#\/orders\//);
  const orderId = orderIdFrom(buyer.page);
  const ref = (await buyer.page.locator('strong.tracking-wider').first().textContent())?.trim() ?? '';

  // Seller accepts and sends it out.
  await openFresh(seller.page, `#/orders/${orderId}`);
  await action(seller.page, hi.orders.actions.accepted).click();
  await action(seller.page, hi.orders.actions.ready).click();
  await action(seller.page, hi.orders.actions.out_for_delivery).click();

  // Coordinator assigns a delivery person and makes the no-login link.
  const coordinator = await loggedIn(browser, PHONES.coordinator);
  await coordinator.page.goto('/#/admin/orders');
  const card = coordinator.page.locator('article', { hasText: ref }).first();
  await card.getByRole('button', { name: hi.admin.assignDelivery }).click();
  await card.getByLabel(hi.admin.deliveryName).fill('सुरेश');
  await card.getByLabel(hi.admin.deliveryPhone).fill('9876500011');
  await card.getByRole('button', { name: hi.save, exact: true }).click();
  await coordinator.page.locator('article', { hasText: ref }).first().getByRole('button', { name: hi.delivery.makeLink }).click();
  const link = (await coordinator.page.locator('article', { hasText: ref }).first().locator('p.break-all').textContent())?.trim() ?? '';
  expect(link).toMatch(/#\/delivery\/[A-Za-z0-9_-]{32}$/);

  // Delivery person: no login, no consent screen, three big buttons and a photo.
  const deliveryPhone = await browser.newContext({ serviceWorkers: 'block' });
  const delivery = await deliveryPhone.newPage();
  await delivery.goto(`/${link.slice(link.indexOf('#'))}`);
  await action(delivery, hi.delivery.buttons.picked).click();
  await action(delivery, hi.delivery.buttons.on_the_way).click();
  await pickPhoto(delivery);
  await action(delivery, hi.delivery.buttons.delivered).click();
  await expect(delivery.getByText(hi.delivery.thanks)).toBeVisible();
  await delivery.reload();
  await expect(delivery.getByText(hi.delivery.linkInvalid)).toBeVisible();

  // Buyer sees the timeline, confirms; seller confirms the money; buyer completes and rates.
  await openFresh(buyer.page, `#/orders/${orderId}`);
  await expect(buyer.page.getByRole('heading', { name: hi.delivery.timeline })).toBeVisible();
  await action(buyer.page, hi.orders.actions.deliveredByBuyer).click();
  await openFresh(seller.page, `#/orders/${orderId}`);
  await action(seller.page, hi.orders.actions.paid).click();
  await action(seller.page, hi.orders.cash).click();
  await buyer.page.reload();
  await action(buyer.page, hi.orders.actions.completed).click();
  await buyer.page.getByRole('radiogroup', { name: hi.orders.rateTitle }).getByRole('radio').nth(4).click();
  await action(buyer.page, hi.orders.rateSubmit).click();
  await expect(buyer.page.getByText(hi.orders.thanksRating)).toBeVisible();
});
