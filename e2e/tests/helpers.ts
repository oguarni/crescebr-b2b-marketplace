import { Page, expect } from '@playwright/test';

/**
 * Demo accounts seeded by the backend on `npm run dev`
 * (backend/seeders/20240101000001-initial-data.cjs). These credentials are
 * public on purpose — this is a portfolio demo.
 */
export const ACCOUNTS = {
  buyer: { cnpj: '33.333.333/0001-33', password: 'buyer123' },
  supplier: { cnpj: '22.222.222/0001-22', password: 'supplier123' },
  admin: { cnpj: '00.000.000/0001-00', password: 'admin123' },
} as const;

export type Role = keyof typeof ACCOUNTS;

/**
 * Log in through the CNPJ tab of the login form. We target the stable input ids
 * (#cnpj, #password) rather than translated labels so the test survives the
 * pt/en language switcher.
 */
export async function login(page: Page, role: Role): Promise<void> {
  const { cnpj, password } = ACCOUNTS[role];

  await page.goto('/login');
  await page.locator('#cnpj').fill(cnpj);
  await page.locator('#password').fill(password);
  await page.locator('form button[type="submit"]').click();

  // On success the app redirects away from /login back to the marketplace home.
  await expect(page).not.toHaveURL(/\/login/);
}
