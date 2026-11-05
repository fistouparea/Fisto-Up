import { hiF } from '../src/strings/hiFeatures';
import { expect, test } from '@playwright/test';
import { hi, loggedIn, openFresh, PHONES } from './fixtures';

test('a buyer raises a complaint about a listing; the coordinator resolves it', async ({ browser }) => {
  const buyer = await loggedIn(browser, PHONES.household);
  await buyer.page.goto('/#/market');
  await buyer.page.getByRole('link', { name: /हरा मूंग/ }).first().click();
  await buyer.page.getByRole('button', { name: hiF.complaints.raise }).click();
  await buyer.page.getByRole('button', { name: hi.orders.reasons.fake_listing }).click();
  await buyer.page.getByLabel(hiF.complaints.describe).fill('फोटो और माल अलग लगते हैं (E2E)');
  await buyer.page.getByRole('button', { name: hi.orders.reportSend }).click();
  await expect(buyer.page).toHaveURL(/#\/complaints\//);
  await expect(buyer.page.getByText(hiF.complaints.status.open).first()).toBeVisible();
  const complaintUrl = new URL(buyer.page.url()).hash;

  const coordinator = await loggedIn(browser, PHONES.coordinator);
  await coordinator.page.goto('/#/admin/complaints');
  const item = coordinator.page.locator('article', { hasText: '(E2E)' }).first();
  await item.getByRole('button', { name: hiF.complaints.admin.take }).click();
  const taken = coordinator.page.locator('article', { hasText: '(E2E)' }).first();
  await expect(taken.getByText(hiF.complaints.status.in_progress).first()).toBeVisible();
  await taken.getByLabel(hiF.complaints.admin.note).fill('विक्रेता से नई फोटो ली गई');
  await taken.getByRole('button', { name: hiF.complaints.admin.to.resolved }).click();

  await openFresh(buyer.page, complaintUrl);
  await expect(buyer.page.getByText(hiF.complaints.status.resolved).first()).toBeVisible();
  await expect(buyer.page.getByText(/विक्रेता से नई फोटो ली गई/)).toBeVisible();
});
