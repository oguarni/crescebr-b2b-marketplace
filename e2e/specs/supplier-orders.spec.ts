import { test, expect } from '@playwright/test';
import { signIn } from '../fixtures/accounts';

/**
 * The supplier order screen, against real seeded orders.
 *
 * This is the seam that let a visible defect ship. `getOrderHistory` returns
 * synthesized entries — `{ status, description, date, canTransitionTo }` — but
 * the page cast them to `OrderStatusHistory` and read `toStatus`, `createdAt`
 * and `notes`, so every timeline row rendered an empty status and the literal
 * string "Invalid Date". The vitest suite passed throughout, because it mocks
 * `ordersService` and therefore returns whatever shape the test author assumed.
 *
 * Nothing caught it because nothing could: the seeder created users and
 * products only, so the `orders` table was empty and no test at any level had
 * an order to open. Order fixtures now come from
 * `backend/seeders/20260827000000-order-lifecycle-fixtures.cjs`, one per status
 * the screen branches on.
 *
 * The page is translated, and the interface defaults to Portuguese. These
 * specs pin English through the stored language preference before any page
 * loads, so the labels they locate by cannot change underneath them. Prefer
 * ids for new specs; pinning is for the ones written against labels.
 */

test.describe('supplier orders', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('crescebr_language', 'en'));
  });

  test('the order timeline renders real statuses and dates', async ({ page }) => {
    await signIn(page, 'supplier');
    await page.goto('/supplier/orders');

    // Narrowed by tab rather than by id: an order card shows a status chip but
    // never the order id, so the tab is the only stable route to a known one.
    await page.getByRole('tab', { name: /^Shipped/ }).click();
    await page.getByRole('button', { name: 'Details' }).first().click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Order History')).toBeVisible();

    // The order items render in a Table, so the only list items in this dialog
    // are timeline entries.
    const entries = dialog.getByRole('listitem');

    // The seeded shipped order has createdAt != updatedAt, so the service emits
    // the opening 'pending' entry plus one for the current status.
    await expect(entries).toHaveCount(2);
    await expect(entries.first()).toContainText('Pending');
    await expect(entries.nth(1)).toContainText('Shipped');

    // The entry's text is chosen by its real `status` field, which the old
    // cast left undefined; in English it is the API's own wording.
    await expect(entries.nth(1)).toContainText('Order has been shipped');

    // The exact regression. `new Date(undefined).toLocaleString()` is the string
    // "Invalid Date", which is what every row showed before the fix. The year
    // comes from the fixture timestamps, so a parseable date is also asserted
    // rather than merely the absence of a broken one.
    await expect(dialog.getByText('Invalid Date')).toHaveCount(0);
    await expect(entries.first()).toContainText('2026');
    await expect(entries.nth(1)).toContainText('2026');
  });

  test('shipping an order requires a tracking number and a 44-digit NF-e key', async ({ page }) => {
    await signIn(page, 'supplier');
    await page.goto('/supplier/orders');

    await page.getByRole('tab', { name: /^Processing/ }).click();
    await page.getByRole('button', { name: 'Mark as shipped' }).first().click();

    const dialog = page.getByRole('dialog');
    const submit = dialog.getByRole('button', { name: 'Update Status' });

    // The seeded processing order carries neither field, so the dialog opens
    // with both empty and the gate closed.
    await expect(submit).toBeDisabled();

    await dialog.getByLabel('Tracking Number').fill('BR000000000PR');
    await expect(submit).toBeDisabled();

    // 43 digits is the interesting case: it proves the gate checks the length
    // rather than merely that the field is non-empty.
    const key = dialog.getByLabel('NF-e Access Key');
    await key.fill('3'.repeat(43));
    await expect(submit).toBeDisabled();

    await key.fill('3'.repeat(43) + '7');
    await expect(submit).toBeEnabled();

    // The input strips non-digits and caps at 44, so pasting a formatted key
    // still leaves the gate satisfied rather than one character over.
    await key.fill('3526 0812 3456 7800 0199 5500 1000 0000 0110 0000 0017');
    await expect(key).toHaveValue('35260812345678000199550010000000011000000017');
    await expect(submit).toBeEnabled();

    // Deliberately not submitting. These fixtures are shared with the timeline
    // spec above and the suite runs fullyParallel; advancing the order's status
    // here would race it.
    await dialog.getByRole('button', { name: 'Cancel' }).click();
  });
});
