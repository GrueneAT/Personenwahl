/**
 * Primary-navigation contract — covers the `.gat-toolnav` Werkzeug-Navigation
 * in App.tsx. The former left sidebar + mobile pill-bar were replaced by a
 * single horizontal Reiter-Leiste under the green brand bar, in the main
 * container. One nav for all viewports (it wraps instead of scrolling), so —
 * unlike the old sidebar — it stays visible at <md too.
 *
 * Covered data-testid set:
 *   nav-overview, nav-stage1, nav-stage3, nav-docs, nav-beispiele (active links)
 *   nav-stage2, nav-stage4 (disabled — aria-disabled="true" + title)
 *   nav-werkzeuge (external), nav-mailto (mailto)
 */
import { test, expect } from '@playwright/test';

const NAV_ROUTES: Array<{ testid: string; expectedHash: string; mode: string }> = [
  { testid: 'nav-overview', expectedHash: '#/overview', mode: 'overview' },
  { testid: 'nav-stage1', expectedHash: '#/stage1', mode: 'stage1' },
  { testid: 'nav-stage3', expectedHash: '#/stage3', mode: 'stage3' },
  { testid: 'nav-docs', expectedHash: '#/docs', mode: 'docs' },
  { testid: 'nav-beispiele', expectedHash: '#/docs/beispiele', mode: 'docs' /* sub-route */ },
];

const DISABLED_NAV_ITEMS: Array<{ testid: string }> = [
  { testid: 'nav-stage2' },
  { testid: 'nav-stage4' },
];

test.describe('Primary navigation (.gat-toolnav)', () => {
  test('toolnav is visible at desktop viewport', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('primary-nav')).toBeVisible();
  });

  for (const { testid, expectedHash } of NAV_ROUTES) {
    test(`${testid} click → URL hash flips to ${expectedHash}`, async ({ page }) => {
      await page.goto('/');
      await page.getByTestId(testid).click();
      // hashchange + signal sync + re-render are synchronous in Solid; a
      // short polling assertion handles any microtask scheduling.
      await expect.poll(() => page.evaluate(() => window.location.hash)).toBe(expectedHash);
    });
  }

  for (const { testid, expectedHash, mode } of NAV_ROUTES) {
    // Skip the sub-route nav-beispiele aria-current check: the docs sub-routes
    // keep the nav-docs top-level item active, so nav-beispiele itself never
    // carries aria-current. Verify that semantics separately below.
    if (testid === 'nav-beispiele') continue;

    test(`${testid} sets aria-current="page" when route active`, async ({ page }) => {
      await page.goto('/');
      // Set hash directly so we can assert the resulting active item without
      // relying on a click side-effect (already covered above).
      await page.evaluate((h) => {
        window.location.hash = h;
      }, expectedHash);
      // Wait for Solid to re-render the aria-current attribute.
      await expect
        .poll(async () => page.getByTestId(testid).getAttribute('aria-current'))
        .toBe('page');
      void mode;
    });
  }

  test('nav-beispiele keeps nav-docs as the active top-level when on docs sub-route', async ({
    page,
  }) => {
    await page.goto('/');
    await page.evaluate(() => {
      window.location.hash = '#/docs/beispiele';
    });
    await expect
      .poll(async () => page.getByTestId('nav-docs').getAttribute('aria-current'))
      .toBe('page');
    // Sub-route link itself is intentionally NOT marked active.
    const beispieleAria = await page.getByTestId('nav-beispiele').getAttribute('aria-current');
    expect(beispieleAria).toBeNull();
  });

  for (const { testid } of DISABLED_NAV_ITEMS) {
    test(`${testid} is rendered as aria-disabled with a title tooltip`, async ({ page }) => {
      await page.goto('/');
      const item = page.getByTestId(testid);
      await expect(item).toBeVisible();
      await expect(item).toHaveAttribute('aria-disabled', 'true');
      const title = await item.getAttribute('title');
      expect(title).toBeTruthy();
      expect((title ?? '').length).toBeGreaterThan(10);
    });
  }

  test('nav-werkzeuge is an external link with target/rel and the hub URL', async ({ page }) => {
    await page.goto('/');
    const item = page.getByTestId('nav-werkzeuge');
    await expect(item).toBeVisible();
    await expect(item).toHaveAttribute('href', 'https://werkzeuge.gruene.at/');
    await expect(item).toHaveAttribute('target', '_blank');
    // rel must include "noopener" (tabnabbing mitigation). Equality keeps
    // the contract tight — extra tokens (e.g. "noreferrer") would be a
    // future widening that this test should flag.
    await expect(item).toHaveAttribute('rel', 'noopener');
    // External links never carry the active state — they live outside the
    // app's own route space.
    const ariaCurrent = await item.getAttribute('aria-current');
    expect(ariaCurrent).toBeNull();
  });

  test('nav-mailto is a mailto link to the tool maintainer', async ({ page }) => {
    await page.goto('/');
    const item = page.getByTestId('nav-mailto');
    await expect(item).toBeVisible();
    await expect(item).toHaveAttribute('href', 'mailto:florian.motlik@gruene.at');
    // mailto: URLs are not navigable browsing contexts — target/rel must
    // not be set. If a future refactor adds them, this assertion fires.
    const target = await item.getAttribute('target');
    expect(target).toBeNull();
    const rel = await item.getAttribute('rel');
    expect(rel).toBeNull();
    // Mailto link sits outside the route space — no active state.
    const ariaCurrent = await item.getAttribute('aria-current');
    expect(ariaCurrent).toBeNull();
  });
});

test.describe('Primary navigation at <md viewport', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('toolnav stays visible on mobile (wraps instead of scrolling)', async ({ page }) => {
    await page.goto('/');
    // Unlike the old sidebar, the toolnav is the single nav for every
    // breakpoint — it must remain visible at <md.
    await expect(page.getByTestId('primary-nav')).toBeVisible();
    await expect(page.getByTestId('nav-stage1')).toBeVisible();
  });
});
