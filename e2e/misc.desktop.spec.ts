import { expect, test } from '@playwright/test';
import { authFile } from './data';

// Stats, account, admin misc, auth and 404 (redesign 06d). Leaves the seed
// as it found it: everything created here gets a unique name and is removed
// again where the UI allows it (a created user stays, but no spec counts users).

const unique = () => Date.now().toString(36);

test.describe('as a member', () => {
  test.use({ storageState: authFile('member') });

  test('stats show the readouts and stock by material and type', async ({
    page,
  }) => {
    await page.goto('/stats');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Statistics' })
    ).toBeVisible();
    for (const label of [
      'Used · 30 days',
      'Average / month',
      'Cost · 30 days',
      'Stock value',
    ]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }
    // The seed has one baseline weighing per spool, so nothing was used yet.
    const monthly = page.getByRole('region', { name: /Monthly usage/ });
    await expect(monthly).toContainText('No usage yet');
    await expect(
      page.getByRole('region', { name: /By material/ })
    ).toContainText('Black');
    await expect(
      page.getByRole('region', { name: /By filament type/ })
    ).toContainText('Stock composition');
  });

  test('create an API token, see it once, then revoke it', async ({ page }) => {
    const name = `E2E scale ${unique()}`;
    await page.goto('/account');
    await page.getByLabel('Token name').fill(name);
    await page.getByRole('button', { name: 'Create token' }).click();

    const reveal = page.locator('[data-slot=token-reveal]');
    await expect(reveal).toContainText(/sph_[\w-]+/);
    await expect(reveal).toContainText("won't be shown again");
    const row = page.getByRole('row', { name: new RegExp(name) });
    await expect(row).toContainText('never');

    await page.getByRole('button', { name: `Revoke ${name}` }).click();
    const confirm = page.getByRole('dialog', { name: `Revoke "${name}"?` });
    await confirm.getByRole('button', { name: 'Revoke' }).click();
    await expect(row).toHaveCount(0);
  });

  // Signed out, proxy.ts sends every unknown path to /login first.
  test('an unknown route shows the 404 with a way back', async ({ page }) => {
    const res = await page.goto('/no-such-shelf');
    expect(res?.status()).toBe(404);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Nothing on this shelf' })
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Back to overview' })
    ).toHaveAttribute('href', '/');
  });

  test('admin pages send members back to the overview', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page).toHaveURL('/');
  });
});

test.describe('as an admin', () => {
  test.use({ storageState: authFile('admin') });

  test('create a user and make them a trusted contributor', async ({
    page,
  }) => {
    const id = unique();
    const name = `E2E Person ${id}`;
    await page.goto('/admin/users');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Users' })
    ).toBeVisible();

    const panel = page.getByRole('region', { name: /Create user/ });
    await panel.getByLabel('Name').fill(name);
    await panel.getByLabel('Email').fill(`e2e-${id}@example.org`);
    await panel.getByLabel('Temporary password').fill('a-temporary-password');
    await panel.getByRole('button', { name: 'Create user' }).click();

    const row = page.getByRole('row', { name: new RegExp(name) });
    await expect(row).toContainText('Member');
    const trusted = page.getByRole('switch', {
      name: `Trusted contributor: ${name}`,
    });
    await expect(trusted).not.toBeChecked();
    await trusted.click();
    await expect(trusted).toBeChecked();
    await page.reload();
    await expect(trusted).toBeChecked();
  });

  test('add, edit and delete a property definition', async ({ page }) => {
    const key = `e2e_${unique()}`;
    await page.goto('/admin/properties');
    await page.getByRole('button', { name: 'New property' }).click();

    let dialog = page.getByRole('dialog', { name: 'New property' });
    await dialog.getByLabel('Name').fill('E2E strength');
    await dialog.getByLabel('Key').fill(key);
    await dialog.getByLabel(/Unit/).fill('MPa');
    await dialog.getByRole('button', { name: 'Add property' }).click();
    await expect(dialog).toBeHidden();
    const row = page.getByRole('row', { name: new RegExp(key) });
    await expect(row).toContainText('E2E strength');

    await page.getByRole('button', { name: 'Edit E2E strength' }).click();
    dialog = page.getByRole('dialog', { name: 'Edit property' });
    // The machine key is fixed once created.
    await expect(dialog.getByLabel(/Key/)).toHaveAttribute('readonly', '');
    await dialog.getByLabel('Name').fill('E2E hardness');
    await dialog.getByRole('button', { name: 'Integer' }).click();
    await dialog.getByRole('button', { name: 'Save property' }).click();
    await expect(dialog).toBeHidden();
    await expect(row).toContainText('E2E hardness');

    await page.getByRole('button', { name: 'Delete E2E hardness' }).click();
    await page
      .getByRole('dialog', { name: 'Delete "E2E hardness"?' })
      .getByRole('button', { name: 'Delete' })
      .click();
    await expect(row).toHaveCount(0);
  });

  test('the import page lists upstream manufacturers or says why not', async ({
    page,
  }) => {
    await page.goto('/admin/import');
    await expect(
      page.getByRole('heading', { level: 1, name: /Import/ })
    ).toBeVisible();
  });
});

test.describe('signed out', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('registration is closed: no sign-up link, /signup is a 404', async ({
    page,
  }) => {
    await page.goto('/login');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Sign in' })
    ).toBeVisible();
    await expect(page.getByRole('link', { name: /Sign up/ })).toHaveCount(0);

    await page.goto('/signup');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Nothing on this shelf' })
    ).toBeVisible();
  });

  test('a reset request never says whether the account exists', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: 'Forgot password?' }).click();
    await expect(page).toHaveURL('/forgot-password');
    await page.getByLabel('Email').fill('nobody@example.org');
    await page.getByRole('button', { name: 'Send reset link' }).click();
    await expect(page.getByRole('status')).toContainText(
      'If an account exists for this address'
    );
  });
});
