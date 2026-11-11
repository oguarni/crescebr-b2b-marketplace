import { test, expect } from '@playwright/test';
import { ACCOUNTS, signIn } from '../fixtures/accounts';

const apiUrl = `${process.env.E2E_API_URL ?? 'http://127.0.0.1:3001'}${process.env.API_PREFIX ?? '/api/v1'}`;

/**
 * The login round trip, against the real API.
 *
 * The component tests mock the auth service, so they prove the demo cards call
 * it. These prove the call reaches an Express route through the vite proxy,
 * that postgres holds a user matching the seeded credentials, and that whatever
 * the API returns is enough for the app to consider itself signed in.
 */

test.describe('authentication', () => {
  for (const role of ['admin', 'supplier', 'buyer'] as const) {
    test(`${role} signs in with the demo account card`, async ({ page }) => {
      await signIn(page, role);
      await expect(page).not.toHaveURL(/\/login/);
    });
  }

  test('the login page offers only the demo accounts', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('#demo-login-buyer')).toBeVisible();
    await expect(page.locator('#demo-login-supplier')).toBeVisible();
    await expect(page.locator('#demo-login-admin')).toBeVisible();

    // No credential form, no tabs, no way to sign up.
    await expect(page.locator('input')).toHaveCount(0);
    await expect(page.locator('form')).toHaveCount(0);
    await expect(page.getByRole('tab')).toHaveCount(0);
    await expect(page.locator('a[href="/register"]')).toHaveCount(0);
  });

  test('the retired sign-up address lands on the demo sign-in page', async ({ page }) => {
    await page.goto('/register');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator('#demo-login-buyer')).toBeVisible();
    await expect(page.locator('input')).toHaveCount(0);
  });

  test('a wrong password is rejected by the API', async ({ request }) => {
    const response = await request.post(`${apiUrl}/auth/login-email`, {
      data: { email: ACCOUNTS.buyer.email, password: 'definitely-not-the-password' },
    });

    // Pin the status: a throttled login answers 429, which must fail as a
    // throttle instead of passing as a rejected credential.
    expect(response.status()).toBe(401);
  });

  test('a signed-out visitor cannot open a protected route', async ({ page }) => {
    await page.goto('/my-orders');
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });
});
