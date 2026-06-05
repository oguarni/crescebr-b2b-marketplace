import { test, expect } from './fixtures';
import { ACCOUNTS, login, type Role } from './helpers';

test.describe('Authentication', () => {
  test('login page renders the CNPJ form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('#cnpj')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
  });

  // Every seeded role must be able to authenticate.
  for (const role of Object.keys(ACCOUNTS) as Role[]) {
    test(`${role} can log in`, async ({ page }) => {
      await login(page, role);
      await expect(page).not.toHaveURL(/\/login/);
    });
  }

  test('wrong password is rejected and stays on /login', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#cnpj').fill(ACCOUNTS.buyer.cnpj);
    await page.locator('#password').fill('definitely-wrong');
    await page.locator('form button[type="submit"]').click();
    await expect(page).toHaveURL(/\/login/);
  });
});
