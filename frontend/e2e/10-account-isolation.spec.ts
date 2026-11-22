import { expect, test, type Page } from '@playwright/test';
import { cropLabels } from '../src/strings/hi';
import { E2E_AI, hi, login, loggedIn, newPhone, openFresh, PHONES, pickPhoto } from './fixtures';

/** Login and logout reload the app, so wait out a navigation instead of reading in the middle of one. */
async function dataId(page: Page): Promise<string | null> {
  for (;;) {
    try {
      await page.waitForLoadState('load');
      return await page.evaluate(() => localStorage.getItem('agriai.deviceId'));
    } catch (error) {
      if (!String(error).includes('Execution context was destroyed')) throw error;
    }
  }
}

async function logout(page: Page): Promise<void> {
  await page.goto('/#/account');
  const before = await dataId(page);
  await page.getByRole('button', { name: hi.account.logout }).click();
  await expect(page.getByRole('link', { name: hi.account.login, exact: true })).toBeVisible();
  await expect.poll(() => dataId(page)).not.toBe(before);
}

async function savedChecks(page: Page): Promise<number> {
  const id = await dataId(page);
  const body = await page.evaluate(async (deviceId) => (await fetch(`/api/history?deviceId=${deviceId}&page=1&limit=10`)).json(), id);
  return (body as { items: unknown[] }).items.length;
}

test('one phone, three accounts: logout → next login never shows the previous account', async ({ browser }) => {
  const { page } = await loggedIn(browser, PHONES.household);
  const idA = await dataId(page);
  await page.goto('/#/check');
  await page.getByRole('group', { name: hi.steps.crop }).getByRole('button', { name: new RegExp(`^${cropLabels.bajra.hindi}`) }).click();
  await pickPhoto(page);
  await page.getByRole('button', { name: hi.checkPhoto, exact: true }).click();
  await expect(page.getByText(E2E_AI.problem).first()).toBeVisible();
  const checksOfA = await savedChecks(page);
  expect(checksOfA).toBeGreaterThan(0);

  await logout(page);
  expect(await savedChecks(page)).toBe(0);

  for (const phone of [PHONES.worker, PHONES.coordinator]) {
    await login(page, phone);
    expect(await dataId(page)).not.toBe(idA);
    expect(await savedChecks(page)).toBe(0);
    await openFresh(page, '#/history');
    await expect(page.getByText(E2E_AI.problem)).toHaveCount(0);
    await logout(page);
  }

  await login(page, PHONES.household);
  await expect.poll(() => dataId(page)).toBe(idA);
  expect(await savedChecks(page)).toBe(checksOfA);
});

test('a phone left with the id of a logged-out account (old bug) heals when the app opens', async ({ browser }) => {
  const { page } = await newPhone(browser);
  const linked = '00000000-0000-4000-8000-000000000202'; // the seed's household account
  await page.goto('/');
  await page.evaluate((id) => {
    localStorage.setItem('agriai.deviceId', id);
    localStorage.setItem('agriai.cache.farmProfile', JSON.stringify({ data: null, savedAt: 'old' }));
  }, linked);
  await page.reload();
  await expect.poll(() => dataId(page)).not.toBe(linked);
  await page.waitForLoadState('networkidle');
  expect(await page.evaluate(() => localStorage.getItem('agriai.cache.farmProfile'))).toBeNull();
});
