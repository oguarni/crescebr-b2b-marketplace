import { Page, expect } from '@playwright/test';

/**
 * The three roles the marketplace gates on, as seeded by
 * backend/seeders/20240101000001-initial-data.cjs.
 *
 * These are development fixtures, not secrets — the same values are already
 * committed in the seeder. They stay overridable so a CI database seeded from a
 * different source does not need the specs edited.
 */
export const ACCOUNTS = {
  admin: {
    email: process.env.E2E_ADMIN_EMAIL ?? 'admin@crescebr.com',
    password: process.env.E2E_ADMIN_PASSWORD ?? 'admin123',
  },
  supplier: {
    email: process.env.E2E_SUPPLIER_EMAIL ?? 'supplier@example.com',
    password: process.env.E2E_SUPPLIER_PASSWORD ?? 'supplier123',
  },
  buyer: {
    email: process.env.E2E_BUYER_EMAIL ?? 'buyer@example.com',
    password: process.env.E2E_BUYER_PASSWORD ?? 'buyer123',
  },
} as const;

export type Role = keyof typeof ACCOUNTS;

/**
 * Sign in through the one-click demo account on the login page — the only
 * sign-in the interface offers.
 *
 * Deliberately not a token injected into localStorage: the login round trip is
 * one of the seams this suite exists to cover, and faking it would skip the
 * vite proxy, the API contract and whatever the app does with the response.
 * The card submits the credentials compiled into LoginPage, so the E2E_*
 * overrides above apply to API-level specs only.
 *
 * @example await signIn(page, 'buyer')
 */
export async function signIn(page: Page, role: Role): Promise<void> {
  await page.goto('/login');

  // Selecting by id, not by label: the card copy comes from i18n, so a
  // name-based locator breaks the moment the interface language changes.
  await page.locator(`#demo-login-${role}`).click();

  // Landing anywhere other than /login is the signal; the destination differs
  // per role and asserting a specific one here would couple every spec to it.
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
}
