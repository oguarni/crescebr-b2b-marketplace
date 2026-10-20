import { test, expect } from '@playwright/test';

/**
 * Filtering the catalogue on a phone.
 *
 * The filters used to expand inline above the grid with one field per
 * specification key, which pushed the first product roughly 3,000px down; a
 * floating duplicate of the filter button opened that panel above the viewport
 * once the page was scrolled; and closing the panel silently dropped every
 * filter. jsdom has no layout engine, so the vitest suite can check the filter
 * state but not where anything lands on screen. This spec checks the geometry.
 *
 * Named `buyer-*` so the mobile-chrome project runs it as well; the explicit
 * viewport keeps the assertions meaningful under the desktop project too.
 * Located by id, never by label, so the interface language does not matter.
 */

const PHONE = { width: 390, height: 844 };

test.describe('catalogue filters on a phone', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(PHONE);
    await page.goto('/');
    await expect(page.locator('main main .MuiCard-root').first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test('one filter control stays reachable after scrolling', async ({ page }) => {
    await expect(page.locator('button[aria-haspopup="dialog"]')).toHaveCount(1);

    await page.evaluate(() => window.scrollTo(0, 1500));

    // The catalogue header is sticky below the Navbar; at top: 0 it slid under
    // it and took this button out of reach.
    const reachable = await page.locator('#catalog-filter-button').evaluate(button => {
      const box = button.getBoundingClientRect();
      const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      return box.top >= 0 && Boolean(hit && button.contains(hit));
    });
    expect(reachable).toBe(true);
  });

  test('a filter applies, survives closing the panel, and the results are in view', async ({
    page,
  }) => {
    await page.locator('#catalog-filter-button').click();
    const panel = page.locator('#catalog-filters');
    await expect(panel).toBeVisible();

    // The whole panel, its footer included, fits on the screen.
    await expect
      .poll(async () => {
        const box = await panel.boundingBox();
        return box ? box.y >= 0 && box.y + box.height <= PHONE.height + 1 : false;
      })
      .toBe(true);

    const firstAvailability = panel.getByRole('checkbox').first();
    await firstAvailability.check();
    await page.locator('#catalog-filters-apply').click();
    await expect(panel).toBeHidden();

    // The first filtered product is on screen without scrolling.
    const firstCard = page.locator('main main .MuiCard-root').first();
    await expect(firstCard).toBeVisible();
    const cardTop = await firstCard.evaluate(card => card.getBoundingClientRect().top);
    expect(cardTop).toBeLessThan(PHONE.height / 2);

    // Closing the panel keeps the selection.
    await page.locator('#catalog-filter-button').click();
    await expect(panel.getByRole('checkbox').first()).toBeChecked();
  });
});
