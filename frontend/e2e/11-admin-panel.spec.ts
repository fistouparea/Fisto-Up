import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { ADMIN_TABS } from '../src/hooks/useHashRoute';
import { hiAdmin } from '../src/strings/hiAdmin';
import { hi, loggedIn, newPhone, PHONES } from './fixtures';

test('invite code: coordinator switches it on, makes a code, a new person signs up with it', async ({ browser }) => {
  const { page } = await loggedIn(browser, PHONES.coordinator);
  await page.goto('/#/admin/invites');
  await page.getByRole('button', { name: hiAdmin.invites.turnOn }).click();
  await page.getByRole('button', { name: hiAdmin.console.confirm }).click();
  await expect(page.getByText(hiAdmin.invites.requiredOn)).toBeVisible();

  await page.getByRole('button', { name: hiAdmin.invites.create, exact: true }).click();
  const made = page.getByRole('status').filter({ hasText: hiAdmin.invites.created }).locator('p.select-all');
  await expect(made).toHaveText(/^[2-9A-Z]{6}$/);
  const code = (await made.textContent())?.trim() ?? '';

  const { page: guest } = await newPhone(browser);
  await guest.goto('/#/register');
  await guest.getByRole('button', { name: new RegExp(hi.auth.roleBuyer) }).first().click();
  await guest.getByLabel(hi.auth.inviteCode).fill(code);
  await guest.getByLabel(hi.auth.name).fill('नया खरीदार');
  await guest.getByLabel(hi.auth.phone).fill('9811100022');
  await guest.getByLabel(hi.auth.newPin, { exact: true }).fill('7305');
  await guest.getByLabel(hi.auth.pinAgain).fill('7305');
  await guest.locator('form button[type=submit]').click();
  await expect(guest.getByRole('link', { name: new RegExp(`^${hi.account.open}: नया खरीदार`) })).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: new RegExp(`^${hiAdmin.invites.status.usedUp}`) }).click();
  await expect(page.getByText(code, { exact: true })).toBeVisible();

  await page.getByRole('button', { name: hiAdmin.invites.turnOff }).click();
  await page.getByRole('button', { name: hiAdmin.console.confirm }).click();
  await expect(page.getByText(hiAdmin.invites.requiredOff)).toBeVisible();
});

test('the phone menu opens the panel screens', async ({ browser }) => {
  const { page } = await loggedIn(browser, PHONES.coordinator);
  await page.goto('/#/admin');
  await page.getByRole('button', { name: hiAdmin.console.menu, exact: true }).click();
  await page.getByRole('dialog').getByRole('link', { name: hiAdmin.tabs.users }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1, name: hiAdmin.tabs.users })).toBeVisible();
});

for (const [size, width, height] of [['phone', 360, 780], ['computer', 1366, 850]] as const) {
  test(`every panel screen on a ${size}: opens, no sideways scroll, no WCAG A/AA violation`, async ({ browser }) => {
    const { page } = await loggedIn(browser, PHONES.coordinator);
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const problems: string[] = [];
    for (const tab of ADMIN_TABS) {
      await page.goto(`/#/admin/${tab}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(400);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      if (await page.getByText(hi.admin.loadFailed).count()) problems.push(`${tab}: did not load`);
      if (await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)) problems.push(`${tab}: scrolls sideways`);
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      for (const violation of violations) problems.push(`${tab}: ${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).slice(0, 2).join(' | ')}`);
    }
    expect(problems, problems.join('\n')).toEqual([]);
  });
}
