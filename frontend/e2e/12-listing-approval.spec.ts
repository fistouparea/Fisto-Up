import { expect, test } from '@playwright/test';
import { hiAdmin } from '../src/strings/hiAdmin';
import { hi, loggedIn, newPhone, openFresh, PHONES, pickPhoto, SNAP_LIST_TITLE } from './fixtures';

test('new seller lists bajra → coordinator approves it → the seller sees it live → the buyer finds it', async ({ browser }) => {
  const name = 'मंज़ूरी टेस्ट विक्रेता';
  const { page } = await newPhone(browser);
  const main = page.getByRole('main');
  await page.goto('/#/register');
  await page.getByRole('button', { name: new RegExp(hi.auth.roleSeller) }).first().click();
  await page.getByLabel(hi.auth.name).fill(name);
  await page.getByLabel(hi.auth.phone).fill('9811100044');
  await page.getByLabel(hi.auth.newPin, { exact: true }).fill('7305');
  await page.getByLabel(hi.auth.pinAgain).fill('7305');
  await page.locator('form button[type=submit]').click();
  await page.getByLabel(hi.sellerProfile.village).fill('घांघू');
  await main.getByRole('button', { name: /चूरू/ }).first().click();
  await main.getByRole('button', { name: hi.save, exact: true }).click();
  await expect(page).toHaveURL(/#\/sell$/);

  await page.goto('/#/sell/new');
  await pickPhoto(page);
  await page.locator('#sell-text').fill('दस क्विंटल बाजरा, पच्चीस सौ रुपये क्विंटल');
  await main.getByRole('button', { name: hi.sell.next, exact: true }).click();
  await main.getByRole('button', { name: hi.sell.confirm, exact: true }).click();
  // Never "बिक्री में डाल दिया" while buyers cannot see it.
  await expect(main.getByText(hi.sell.donePending)).toBeVisible();
  await expect(page.getByText(hi.sell.doneTitle)).toHaveCount(0);
  await main.getByRole('button', { name: hi.sell.goToMySales }).click();
  await expect(main.getByText(hi.sell.notLive, { exact: true })).toBeVisible();

  const buyer = await loggedIn(browser, PHONES.hotel);
  await buyer.page.goto('/#/market');
  const inMarket = buyer.page.getByRole('link', { name: new RegExp(SNAP_LIST_TITLE) }).filter({ hasText: name });
  await buyer.page.waitForLoadState('networkidle');
  await expect(inMarket).toHaveCount(0);

  const admin = await loggedIn(browser, PHONES.coordinator);
  await admin.page.goto('/#/admin');
  await admin.page.getByRole('main').getByRole('link', { name: new RegExp(hiAdmin.console.work.listings) }).click();
  const row = admin.page.getByRole('listitem').filter({ hasText: name });
  await row.getByRole('button', { name: hiAdmin.allListings.approve }).click();
  await row.getByRole('button', { name: hiAdmin.console.confirm }).click();
  await expect(row).toHaveCount(0);

  // The seller's open screen follows by itself, without a reload.
  await expect(main.getByText(hi.sell.notLive, { exact: true })).toHaveCount(0);
  await expect(main.getByText(hi.account.pendingHint)).toHaveCount(0);

  await openFresh(buyer.page, '#/market');
  await expect(buyer.page.getByRole('link', { name: new RegExp(SNAP_LIST_TITLE) }).first()).toBeVisible();
  const found = await buyer.page.evaluate(async () => (await fetch('/api/market/listings')).json());
  expect((found as { items: { seller: { name: string } }[] }).items.map((item) => item.seller.name)).toContain(name);
});
