import { expect, test } from '@playwright/test';
import { hi, newPhone } from './fixtures';

test('the app opens offline with the last saved data', async ({ browser }) => {
  const { context, page } = await newPhone(browser, { serviceWorkers: 'allow' });
  await page.goto('/#/weather');
  // The service worker (production build) caches the app; the screen saves its data on the phone.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: hi.weather.title }).first()).toBeVisible();

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText(hi.offline.banner)).toBeVisible();
  await expect(page.getByRole('heading', { name: hi.weather.title }).first()).toBeVisible();
  await context.setOffline(false);
});
