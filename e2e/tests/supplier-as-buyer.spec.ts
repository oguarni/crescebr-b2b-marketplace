import { test, expect } from '@playwright/test';
import { login } from './helpers';

/**
 * Regression guard for the product rule: ANY authenticated company can act as a
 * buyer. A supplier-role account must reach the buyer pages (/my-quotations,
 * /my-orders) without an "access denied" wall and without being bounced to
 * /login. See the 2026-06-05 fix in CLAUDE.md.
 */
test.describe('Supplier acting as buyer', () => {
  test('supplier can open /my-quotations', async ({ page }) => {
    await login(page, 'supplier');
    await page.goto('/my-quotations');

    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByText(/acesso negado|access denied/i)).toHaveCount(0);
  });

  test('supplier can open /my-orders', async ({ page }) => {
    await login(page, 'supplier');
    await page.goto('/my-orders');

    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByText(/acesso negado|access denied/i)).toHaveCount(0);
  });
});
