import { test, expect, Page } from '@playwright/test';

/**
 * Catalog card → product details, in a real browser against the real API.
 *
 * The unit tests prove the card links to `/products/:id` and that the page
 * renders a mocked product. These prove the seeded product the card shows is
 * the one the details route loads through the vite proxy, that history works
 * across the two, and that hover and touch each do the right thing.
 *
 * Named `buyer-*` so it also runs under the mobile-chrome project.
 *
 * Request budget: every product endpoint, including `/products/:id`, is behind
 * searchRateLimit — 200 requests per 15 minutes per IP, in every NODE_ENV — and
 * the whole suite shares one IP. A catalog load in the dev server costs several
 * of them (StrictMode runs effects twice; 304s still count). So catalog loads
 * are consolidated here, and only the touch-specific checks repeat on mobile.
 */

const cardLinks = (page: Page) => page.locator('main a[href^="/products/"]');
const heading = (page: Page) => page.getByRole('heading', { level: 1 });

async function openCatalog(page: Page) {
  await page.goto('/');
  await expect(cardLinks(page).first()).toBeVisible({ timeout: 20_000 });
}

const cardName = async (page: Page, index: number) =>
  (await cardLinks(page).nth(index).locator('.MuiTypography-subtitle2').textContent())?.trim() ??
  '';

test.describe('product details on desktop', () => {
  test.skip(({ isMobile }) => isMobile, 'Covered once on desktop; see the request budget above.');

  test('cards open their own details pages, and history moves between them', async ({ page }) => {
    await openCatalog(page);
    const href = await cardLinks(page).first().getAttribute('href');
    const firstName = await cardName(page, 0);
    const secondName = await cardName(page, 1);
    expect(href).toMatch(/^\/products\/\d+$/);
    expect(secondName).not.toBe(firstName);

    await cardLinks(page).first().click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(heading(page)).toHaveText(firstName);

    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await page.goForward();
    await expect(heading(page)).toHaveText(firstName);

    // A second product replaces the first one's content, not just the URL.
    await page.goBack();
    await cardLinks(page).nth(1).click();
    await expect(heading(page)).toHaveText(secondName);
  });

  test('a resting mouse previews a card, leaving dismisses it, and add-to-quote stays put', async ({
    page,
  }) => {
    await openCatalog(page);
    const card = page.locator('main .MuiCard-root').first();
    const preview = card.locator('[data-testid^="product-preview-"]');

    await card.locator('img').hover();
    await expect(preview).toBeVisible();
    await expect(page).toHaveURL(/\/$/);

    // Move well clear of every card.
    await page.mouse.move(0, 0);
    await expect(preview).toHaveCount(0);

    await card.getByRole('button').click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('Escape dismisses a preview for good while the pointer stays put', async ({ page }) => {
    await openCatalog(page);
    const card = page.locator('main .MuiCard-root').first();
    const preview = card.locator('[data-testid^="product-preview-"]');

    await card.locator('img').hover();
    await expect(preview).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(preview).toHaveCount(0);

    // Removing the hovered overlay used to make Chrome dispatch a fresh
    // pointerover on the image beneath it, which React reads as entering the
    // card again — so the preview reopened 250 ms later with no movement.
    await page.waitForTimeout(1_000);
    await expect(preview).toHaveCount(0);

    // A real re-entry still opens it.
    await page.mouse.move(0, 0);
    await card.locator('img').hover();
    await expect(preview).toBeVisible();
  });

  test('unknown product ids show the not-found state', async ({ page }) => {
    // A numeric id the API answers with 404, and one rejected before any request.
    await page.goto('/products/999999');
    await expect(page.locator('main svg[data-testid="SearchOffIcon"]')).toBeVisible({
      timeout: 20_000,
    });
    await expect(heading(page)).toHaveCount(0);

    await page.goto('/products/not-a-number');
    await expect(page.locator('main svg[data-testid="SearchOffIcon"]')).toBeVisible();
    await expect(heading(page)).toHaveCount(0);

    // The empty state's action leads back to the catalog in any language.
    await page.locator('main').getByRole('button').last().click();
    await expect(page).toHaveURL(/\/$/);
  });
});

test('a direct product URL loads cleanly and never scrolls sideways', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.goto('/products/1');

  await expect(heading(page)).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('main img').first()).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(0);
  expect(errors, errors.join(' | ')).toEqual([]);
});

test('a tap opens the details page with no preview in between', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Touch behaviour is checked on the mobile project.');
  await openCatalog(page);
  const href = await cardLinks(page).first().getAttribute('href');

  await cardLinks(page).first().tap();

  await expect(page).toHaveURL(new RegExp(`${href}$`));
  await expect(page.locator('[data-testid^="product-preview-"]')).toHaveCount(0);
});
