import { expect, test } from '@playwright/test';
import { cropLabels } from '../src/strings/hi';
import { hi, newPhone, pickPhoto } from './fixtures';

test('diagnosis → ज़रूरी सामान → partner product from a licensed input dealer', async ({ browser }) => {
  const { page } = await newPhone(browser);
  await page.goto('/#/check');
  await page.getByRole('group', { name: hi.steps.crop }).getByRole('button', { name: new RegExp(`^${cropLabels.bajra.hindi}`) }).click();
  await pickPhoto(page);
  await page.getByRole('button', { name: hi.checkPhoto, exact: true }).click();

  const kit = page.locator('section', { has: page.getByRole('heading', { name: hi.kit.title }) });
  await expect(kit).toBeVisible();
  await expect(kit.getByText('मैंकोजेब').first()).toBeVisible();
  await expect(kit.getByText(hi.kit.partnerNote)).toBeVisible();
  const product = kit.getByRole('link', { name: /मैंकोजेब 75% WP/ });
  await expect(product).toContainText(hi.kit.partner);
  await product.click();
  await expect(page.getByRole('heading', { name: /मैंकोजेब 75% WP/ })).toBeVisible();
});
