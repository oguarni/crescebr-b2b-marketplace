import { test, expect } from '@playwright/test';
import { signIn } from '../fixtures/accounts';
import { apiUrl, sessionFor } from '../fixtures/api';

/**
 * System settings across the seam: an administrator edits them in the UI, the
 * API stores them in PostgreSQL, and the very next quote is priced with them.
 *
 * Settings are global, so every test puts back what it found, in `finally`.
 * CI runs the suite with one worker; locally, keep other specs from pricing
 * quotes while this one runs if you need exact totals there.
 */
test.describe.configure({ mode: 'serial' });

interface SettingsRecord {
  data: { settings: { taxRate: number } & Record<string, unknown>; version: number };
}

test('an admin changes the tax rate and the next buyer quote uses it', async ({
  page,
  request,
}) => {
  const admin = await sessionFor(request, 'admin');
  const buyer = await sessionFor(request, 'buyer');
  const read = async () =>
    (await (
      await request.get(`${apiUrl}/admin/settings`, { headers: admin.headers })
    ).json()) as SettingsRecord;
  const original = await read();

  try {
    await signIn(page, 'admin');
    await page.goto('/admin/settings');

    const tax = page.locator('#settings-taxRatePercent');
    await expect(tax).toHaveValue(String(Math.round(original.data.settings.taxRate * 10000) / 100));
    await tax.fill('7');
    await page.locator('#settings-save').click();
    // Saved: the form matches the stored row again, so there is nothing to save.
    await expect(page.locator('#settings-save')).toBeDisabled({ timeout: 15_000 });

    const stored = await read();
    expect(stored.data.settings.taxRate).toBe(0.07);
    expect(stored.data.version).toBe(original.data.version + 1);

    const quote = await request.post(`${apiUrl}/quotations/calculate`, {
      headers: buyer.headers,
      data: { items: [{ productId: 1, quantity: 100 }] },
    });
    expect(quote.status()).toBe(200);
    const { calculations } = (await quote.json()).data;
    expect(calculations.taxRate).toBe(0.07);
    expect(calculations.totalTax).toBeCloseTo(calculations.totalSubtotal * 0.07, 2);
  } finally {
    const current = await read();
    await request.put(`${apiUrl}/admin/settings`, {
      headers: admin.headers,
      data: { settings: original.data.settings, version: current.data.version },
    });
  }
});

test('a save from a stale version is refused and the stored row is kept', async ({ request }) => {
  const admin = await sessionFor(request, 'admin');
  const record = (await (
    await request.get(`${apiUrl}/admin/settings`, { headers: admin.headers })
  ).json()) as SettingsRecord;

  const stale = await request.put(`${apiUrl}/admin/settings`, {
    headers: admin.headers,
    data: {
      settings: { ...record.data.settings, taxRate: 0.3 },
      version: record.data.version + 5,
    },
  });
  expect(stale.status()).toBe(409);

  const after = (await (
    await request.get(`${apiUrl}/admin/settings`, { headers: admin.headers })
  ).json()) as SettingsRecord;
  expect(after.data).toEqual(record.data);
});

test('only an administrator reads or writes the settings', async ({ request }) => {
  for (const role of ['buyer', 'supplier'] as const) {
    const session = await sessionFor(request, role);
    const read = await request.get(`${apiUrl}/admin/settings`, { headers: session.headers });
    expect(read.status()).toBe(403);
  }
  // The buyer-facing terms are public on purpose.
  const policy = await request.get(`${apiUrl}/settings/pricing`);
  expect(policy.status()).toBe(200);
  expect((await policy.json()).data).toHaveProperty('taxRate');
});
