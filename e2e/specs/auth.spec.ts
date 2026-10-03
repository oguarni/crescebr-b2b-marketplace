import { test, expect } from '@playwright/test';
import { ACCOUNTS, signIn, openEmailTab } from '../fixtures/accounts';

/**
 * The login round trip, against the real API.
 *
 * The component tests mock the auth service, so they prove the form calls it.
 * These prove the call reaches an Express route through the vite proxy, that
 * postgres holds a user matching the seeded credentials, and that whatever the
 * API returns is enough for the app to consider itself signed in.
 */

test.describe('authentication', () => {
  for (const role of ['admin', 'supplier', 'buyer'] as const) {
    test(`${role} signs in with seeded credentials`, async ({ page }) => {
      await signIn(page, role);
      await expect(page).not.toHaveURL(/\/login/);
    });
  }

  test('a wrong password is rejected and does not sign the user in', async ({ page }) => {
    await page.goto('/login');
    await openEmailTab(page);
    await page.locator('#email').fill(ACCOUNTS.buyer.email);
    await page.locator('#password').fill('definitely-not-the-password');

    const login = page.waitForResponse(
      response =>
        response.url().includes('/auth/login-email') && response.request().method() === 'POST'
    );
    await page.locator('form button[type="submit"]').click();

    // Pin the status rather than only the URL. A throttled login answers 429
    // and also leaves the visitor on /login with the password field showing, so
    // the URL alone cannot tell a rejected credential from a rate limit — and
    // this suite signs in often enough to meet one. A throttle should fail as a
    // throttle instead of passing as a successful rejection.
    expect((await login).status()).toBe(401);

    // Staying put is still the assertion that matters. The error copy is i18n
    // and would make this a translation test rather than an authentication one.
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('#email')).toHaveValue(ACCOUNTS.buyer.email);
    await expect(page.locator('#password')).toHaveValue('definitely-not-the-password');
  });

  test('a signed-out visitor cannot open a protected route', async ({ page }) => {
    await page.goto('/my-orders');
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });
});
