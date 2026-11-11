import { expect, test } from '@playwright/test';
import { authFile, users } from './data';

// Overview + Inventory (redesign 06a). Leaves the seed as it found it: the
// shell specs count spools and requests, so a re-weigh is undone again and
// nothing is added, approved or declined.

test.describe('as a member', () => {
  test.use({ storageState: authFile('member') });

  test('the overview shows key figures and the open borrow request', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Overview' })
    ).toBeVisible();
    const figures = page.getByRole('region', { name: 'Key figures' });
    await expect(figures).toContainText('Spools in stock');
    await expect(figures).toContainText('/ 3');
    const borrows = page.getByRole('region', { name: 'Borrows' });
    await expect(borrows).toContainText(users.admin.name);
    await expect(
      borrows.getByRole('button', { name: /Approve/ })
    ).toBeVisible();
  });

  test('old dashboard links redirect to the new pages', async ({ page }) => {
    await page.goto('/?tab=stock&q=white&type=PETG');
    await expect(page).toHaveURL('/inventory?q=white&type=PETG');
    // Not a group the member is in: /groups/abc itself refuses to /groups.
    await page.goto('/?tab=group-abc');
    await expect(page).toHaveURL(/\/groups(\/abc)?$/);
    await page.goto('/?tab=borrows');
    // /borrows itself is still a placeholder that lands on the overview.
    await expect(page).toHaveURL('/');
  });

  test('inventory filters live in the URL', async ({ page }) => {
    await page.goto('/inventory');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Inventory' })
    ).toBeVisible();
    const black = page.getByRole('region', { name: 'Black PLA' });
    const white = page.getByRole('region', { name: 'White PETG' });
    await expect(black).toBeVisible();
    await expect(white).toBeVisible();

    const status = page.getByRole('group', { name: 'Stock status' });
    await status.getByRole('button', { name: /^Empty/ }).click();
    await expect(page).toHaveURL('/inventory?status=empty');
    await expect(black).toHaveCount(0);
    await expect(white).toBeVisible();

    await status.getByRole('button', { name: /^In stock/ }).click();
    await page
      .getByRole('searchbox', { name: 'Search inventory' })
      .fill('black');
    await expect(page).toHaveURL('/inventory?q=black');
    await expect(white).toHaveCount(0);

    // The shared link restores the view.
    await page.goto('/inventory?q=black');
    await expect(
      page.getByRole('searchbox', { name: 'Search inventory' })
    ).toHaveValue('black');
    await expect(white).toHaveCount(0);
  });

  test('re-weigh a spool, then undo it from the edit dialog', async ({
    page,
  }) => {
    await page.goto('/inventory');
    const black = page.getByRole('region', { name: 'Black PLA' });
    await black.getByRole('button', { name: 'Re-weigh spool #01' }).click();
    await page.getByLabel('Measured total weight (g)').fill('950');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(black).toContainText(/700\s*g/);

    await black.getByRole('button', { name: 'Edit spool #01' }).click();
    const dialog = page.getByRole('dialog', { name: 'Edit spool' });
    await expect(dialog).toContainText('Black / #01');
    await dialog.getByRole('button', { name: 'Undo last' }).click();
    await expect(page.getByText(/^Weight restored to/)).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(black).toContainText(/800\s*g/);
  });

  test('the add-spool dialog validates before saving', async ({ page }) => {
    await page.goto('/inventory');
    await page
      .getByRole('button', { name: /^Add spool/ })
      .first()
      .click();
    const dialog = page.getByRole('dialog', { name: 'Add new spool' });
    await dialog.getByRole('button', { name: /^Add spool/ }).click();
    await expect(dialog.getByRole('alert')).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();
  });
});
