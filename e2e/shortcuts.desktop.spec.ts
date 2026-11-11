import { expect, test, type Locator, type Page } from '@playwright/test';
import { authFile } from './data';

// Keyboard shortcuts (redesign 06e). Leaves the seed as it found it: dialogs
// are closed again, the re-weigh is undone, and the review queue is only
// skipped, never decided.

// The listeners attach after hydration, so retry the key until it lands.
async function pressUntil(page: Page, key: string, visible: Locator) {
  await expect(async () => {
    await page.keyboard.press(key);
    await expect(visible).toBeVisible({ timeout: 1_000 });
  }).toPass();
}

test.describe('as a member', () => {
  test.use({ storageState: authFile('member') });

  test('N adds a spool, / searches, typing never fires', async ({ page }) => {
    await page.goto('/inventory');
    const dialog = page.getByRole('dialog', { name: 'Add new spool' });
    await pressUntil(page, 'n', dialog);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    const search = page.getByRole('searchbox', { name: 'Search inventory' });
    await page.keyboard.press('/');
    await expect(search).toBeFocused();
    await expect(search).toHaveValue('');
    await page.keyboard.type('n');
    await expect(search).toHaveValue('n');
    await expect(dialog).toBeHidden();
  });

  test('N on the overview, R and / on the catalog', async ({ page }) => {
    await page.goto('/');
    const dialog = page.getByRole('dialog', { name: 'Add new spool' });
    await pressUntil(page, 'n', dialog);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    await page.goto('/materials');
    const request = page.getByRole('dialog', {
      name: 'Request a new material',
    });
    await pressUntil(page, 'r', request);
    await page.keyboard.press('Escape');
    await expect(request).toBeHidden();

    await page.keyboard.press('/');
    await expect(
      page.getByRole('searchbox', { name: 'Search materials' })
    ).toBeFocused();
  });

  test('modifier combos are left to the browser', async ({ page }) => {
    await page.goto('/inventory');
    const dialog = page.getByRole('dialog', { name: 'Add new spool' });
    await pressUntil(page, 'n', dialog);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await page.keyboard.press('Shift+N');
    await page.keyboard.press('Alt+n');
    await expect(dialog).toBeHidden();
  });
});

test.describe('as an admin', () => {
  test.use({ storageState: authFile('admin') });

  test('↵ saves a re-weigh', async ({ page }) => {
    await page.goto('/inventory');
    const black = page.getByRole('region', { name: 'Black PLA' });
    await black.getByRole('button', { name: 'Re-weigh spool #01' }).click();
    await page.getByLabel('Measured total weight (g)').fill('900');
    await page.keyboard.press('Enter');
    await expect(black).toContainText(/650\s*g/);

    await black.getByRole('button', { name: 'Edit spool #01' }).click();
    const dialog = page.getByRole('dialog', { name: 'Edit spool' });
    await dialog.getByRole('button', { name: 'Undo last' }).click();
    await expect(page.getByText(/^Weight restored to/)).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(black).toContainText(/600\s*g/);
  });

  test('the review queue skips with J and edits with E', async ({ page }) => {
    await page.goto('/admin/materials/review');
    await expect(page.getByText('1 of 2 pending · oldest first')).toBeVisible();
    const first = page.getByRole('article', { name: /^Reviewing / });
    const firstName = await first.getAttribute('aria-label');

    await pressUntil(
      page,
      'j',
      page.getByText('2 of 2 pending · oldest first')
    );
    await expect(page).toHaveURL(/\?skip=1$/);
    await expect(first).not.toHaveAttribute('aria-label', firstName!);

    const edit = page.getByRole('dialog');
    await page.keyboard.press('e');
    await expect(edit).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(edit).toBeHidden();
    await expect(page.getByText('2 of 2 pending · oldest first')).toBeVisible();
  });
});
