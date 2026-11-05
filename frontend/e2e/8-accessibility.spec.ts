import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { loggedIn, newPhone, PHONES } from './fixtures';

/** WCAG 2.1 A/AA checks of the main farmer, seller and coordinator screens (axe-core). */
async function axe(page: Page, hash: string): Promise<string[]> {
  await page.goto(`/${hash}`);
  await page.waitForLoadState('networkidle');
  // Screens fade in; measuring contrast mid-animation reports dark text as faint. Reduced motion (which the app
  // honours) and a short settle time measure the screen as the farmer sees it.
  await page.waitForTimeout(400);
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  return result.violations.map((violation) => `${hash} ${violation.id} (${violation.impact}): ${violation.nodes.map((node) => node.target.join(' ')).slice(0, 3).join(' | ')}`);
}

test('main screens have no WCAG A/AA violations', async ({ browser }) => {
  const problems: string[] = [];
  const farmer = await newPhone(browser);
  await farmer.page.emulateMedia({ reducedMotion: 'reduce' });
  await farmer.page.addInitScript(() => localStorage.setItem('agriai.flag.onboardingDone', '1'));
  for (const hash of ['#/', '#/check', '#/weather', '#/water', '#/calendar', '#/history', '#/farm', '#/settings', '#/schemes', '#/market', '#/services/equipment', '#/services/labour', '#/services/livestock', '#/mandi-trips', '#/help', '#/my-data']) {
    problems.push(...(await axe(farmer.page, hash)));
  }
  const buyer = await loggedIn(browser, PHONES.household);
  await buyer.page.emulateMedia({ reducedMotion: 'reduce' });
  for (const hash of ['#/orders', '#/services/my', '#/complaints', '#/account']) problems.push(...(await axe(buyer.page, hash)));
  const coordinator = await loggedIn(browser, PHONES.coordinator);
  await coordinator.page.emulateMedia({ reducedMotion: 'reduce' });
  for (const hash of ['#/admin', '#/admin/trips', '#/admin/complaints', '#/admin/services']) problems.push(...(await axe(coordinator.page, hash)));
  expect(problems, problems.join('\n')).toEqual([]);
});
