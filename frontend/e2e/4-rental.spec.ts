import { expect, test } from '@playwright/test';
import { hi, loggedIn, PHONES } from './fixtures';

test('equipment rental: farmer asks for a free day, owner says हाँ, both see the phone number', async ({ browser }) => {
  const farmer = await loggedIn(browser, PHONES.household);
  await farmer.page.goto('/#/services/equipment');
  // The demo farm (Ratangarh) is ~40 km from the tractor (Churu): beyond the 30 km default.
  await expect(farmer.page.getByText(hi.services.kinds.equipment.empty)).toBeVisible();
  await farmer.page.getByRole('button', { name: hi.services.lookEverywhere }).click();
  await farmer.page.getByRole('link', { name: /महिंद्रा 575 ट्रैक्टर/ }).click();
  const days = farmer.page.getByRole('group', { name: hi.services.pickDays });
  await days.getByRole('button').last().click();
  await farmer.page.getByRole('button', { name: hi.services.request, exact: true }).click();
  await expect(farmer.page).toHaveURL(/#\/services\/booking\//);
  await expect(farmer.page.getByText(hi.services.bookingStatus.requested).first()).toBeVisible();
  const bookingUrl = new URL(farmer.page.url()).hash;

  const owner = await loggedIn(browser, PHONES.ramesh);
  await owner.page.goto(`/${bookingUrl}`);
  await owner.page.getByRole('button', { name: hi.services.steps.accepted }).click();
  await expect(owner.page.getByRole('link', { name: new RegExp(hi.services.call) })).toBeVisible();

  await farmer.page.reload();
  await expect(farmer.page.getByText(hi.services.bookingStatus.accepted).first()).toBeVisible();
  await expect(farmer.page.getByRole('link', { name: new RegExp(`${hi.services.call}: ${PHONES.ramesh}`) })).toBeVisible();
});
