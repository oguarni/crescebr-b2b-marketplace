import { APIRequestContext, expect } from '@playwright/test';
import { ACCOUNTS, Role } from './accounts';

/** The API base the specs talk to directly, bypassing the UI. */
export const apiUrl = `${process.env.E2E_API_URL ?? 'http://127.0.0.1:3001'}${process.env.API_PREFIX ?? '/api/v1'}`;

/**
 * Signs in through the API and returns the bearer header, for specs that check
 * a contract or arrange state without driving the UI.
 *
 * @example const admin = await sessionFor(request, 'admin');
 */
export async function sessionFor(request: APIRequestContext, role: Role) {
  const response = await request.post(`${apiUrl}/auth/login-email`, { data: ACCOUNTS[role] });
  expect(response.status()).toBe(200);
  const body = (await response.json()) as { data: { accessToken: string; user: { id: number } } };
  return { id: body.data.user.id, headers: { Authorization: `Bearer ${body.data.accessToken}` } };
}
