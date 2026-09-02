/**
 * Impressum + Datenschutzerklärung footer links (#24). Both are external
 * links to gruene.at — no local page in this step (CONTEXT: "beide als Link
 * auf die offiziellen Seiten, keine eigene Impressum-Seite"). Covers the
 * footer in App.tsx, which sits in the shared <main> and therefore renders
 * on every route, including #/docs.
 *
 * The Datenschutzerklärung URL is intentionally "datenschutzerklarung" —
 * no "ä", no "ss". Do not "correct" it in a future edit.
 */
import { test, expect } from '@playwright/test';

test.describe('Footer — Impressum + Datenschutzerklärung', () => {
  test('both links are visible with correct href, target and rel on Stage 3 (default)', async ({
    page,
  }) => {
    await page.goto('/');

    const impressum = page.getByTestId('footer-impressum');
    await expect(impressum).toBeVisible();
    await expect(impressum).toHaveAttribute('href', 'https://gruene.at/impressum/');
    await expect(impressum).toHaveAttribute('target', '_blank');
    await expect(impressum).toHaveAttribute('rel', 'noopener');

    const datenschutz = page.getByTestId('footer-datenschutz');
    await expect(datenschutz).toBeVisible();
    await expect(datenschutz).toHaveAttribute('href', 'https://gruene.at/datenschutzerklarung/');
    await expect(datenschutz).toHaveAttribute('target', '_blank');
    await expect(datenschutz).toHaveAttribute('rel', 'noopener');
  });

  for (const hash of ['#/overview', '#/stage1', '#/stage3', '#/docs']) {
    test(`both links stay visible on route ${hash}`, async ({ page }) => {
      await page.goto(`/${hash}`);
      await expect(page.getByTestId('footer-impressum')).toBeVisible();
      await expect(page.getByTestId('footer-datenschutz')).toBeVisible();
    });
  }
});
