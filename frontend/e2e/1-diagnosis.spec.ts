import { expect, test } from '@playwright/test';
import { cropLabels } from '../src/strings/hi';
import { E2E_AI, hi, pickPhoto } from './fixtures';

test('farmer: consent → photo diagnosis → result → follow-up chat', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: hi.consent.agree }).click();

  await page.goto('/#/check');
  await page.getByRole('group', { name: hi.steps.crop }).getByRole('button', { name: new RegExp(`^${cropLabels.bajra.hindi}`) }).click();
  await pickPhoto(page);
  await page.getByRole('button', { name: hi.checkPhoto, exact: true }).click();

  await expect(page.getByText(E2E_AI.problem)).toBeVisible();
  await expect(page.getByText(hi.dawaiWarning).first()).toBeVisible();
  await expect(page.getByText(hi.kvkAdvice).first()).toBeVisible();

  await page.getByPlaceholder(hi.chat.placeholder).fill('ये दवाई कब डालूँ?');
  await page.getByRole('button', { name: hi.chat.send, exact: true }).click();
  await expect(page.getByText(E2E_AI.chatAnswer)).toBeVisible();
});
