import { expect, test } from '@playwright/test';
import { cropLabels } from '../src/strings/hi';
import { hiF } from '../src/strings/hiFeatures';
import { loggedIn, PHONES } from './fixtures';

test('farmer joins a mandi trip; the coordinator sees who comes with what', async ({ browser }) => {
  const farmer = await loggedIn(browser, PHONES.worker);
  await farmer.page.goto('/#/mandi-trips');
  const trip = farmer.page.locator('section', { hasText: 'चूरू कृषि उपज मंडी' }).last();
  await trip.getByRole('button', { name: cropLabels.moong.hindi, exact: true }).click();
  await trip.getByRole('button', { name: hiF.mandiTrips.join }).click();
  await expect(farmer.page.getByRole('button', { name: hiF.mandiTrips.update })).toBeVisible();

  const coordinator = await loggedIn(browser, PHONES.coordinator);
  await coordinator.page.goto('/#/admin/trips');
  const panel = coordinator.page.locator('article', { hasText: 'चूरू कृषि उपज मंडी' }).first();
  await expect(panel.getByText(/भंवरलाल/)).toBeVisible();
  await expect(panel.getByText(new RegExp(`${cropLabels.moong.hindi} 1`))).toBeVisible();
});
