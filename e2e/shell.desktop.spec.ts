import { expect, test } from '@playwright/test';
import { authFile, expected, GROUP_NAME } from './data';
import { sidebar, signIn, withBadge } from './helpers';

// Never open /notifications here: it marks everything read and would change
// the counts other tests expect.

test.describe('as a member', () => {
  test.use({ storageState: authFile('member') });

  test('sidebar shows the member counts and no Admin section', async ({
    page,
  }) => {
    const m = expected.member;
    await page.goto('/stats');
    const nav = sidebar(page);
    await expect(
      nav.getByRole('link', {
        name: withBadge('Inventory', `${m.inventory} spools in stock`),
      })
    ).toBeVisible();
    await expect(
      nav.getByRole('link', {
        name: withBadge('Borrows', `${m.borrowRequests} open request`),
      })
    ).toBeVisible();
    await expect(
      nav.getByRole('link', {
        name: withBadge('Notifications', `${m.unread} unread`),
      })
    ).toBeVisible();
    await expect(
      nav.getByRole('link', {
        name: withBadge(GROUP_NAME, `${m.groupShared} shared spools`),
      })
    ).toBeVisible();
    await expect(
      nav.getByRole('navigation', { name: 'Catalog' })
    ).toBeVisible();
    await expect(nav.getByRole('navigation', { name: 'Admin' })).toHaveCount(0);
  });

  test('the active item follows navigation', async ({ page }) => {
    await page.goto('/');
    const nav = sidebar(page);
    await expect(
      nav.getByRole('link', { name: 'Overview', exact: true })
    ).toHaveAttribute('aria-current', 'page');

    await nav.getByRole('link', { name: 'Statistics' }).click();
    await expect(page).toHaveURL('/stats');
    await expect(nav.getByRole('link', { name: 'Statistics' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      /statistics/i
    );

    const group = nav.getByRole('link', { name: new RegExp(`^${GROUP_NAME}`) });
    await group.click();
    await expect(page).toHaveURL(/\/groups\/[\w-]+$/);
    await expect(group).toHaveAttribute('aria-current', 'page');
    await expect(nav.locator('[aria-current=page]')).toHaveCount(1);
  });

  test('collapsing the sidebar survives a reload', async ({ page }) => {
    await page.goto('/stats');
    const nav = sidebar(page);
    await nav.getByRole('button', { name: 'Collapse sidebar' }).click();
    await expect(nav).toHaveAttribute('data-collapsed', 'true');

    // The cookie is read on the server, so the first paint is already the rail.
    const response = await page.reload();
    expect(await response?.text()).toContain('data-collapsed="true"');
    await expect(nav).toHaveAttribute('data-collapsed', 'true');

    await nav.getByRole('link', { name: 'Statistics' }).hover();
    await expect(page.getByRole('tooltip')).toHaveText(/Statistics/);

    await nav.getByRole('button', { name: 'Expand sidebar' }).click();
    await page.reload();
    await expect(nav).toHaveAttribute('data-collapsed', 'false');
  });

  test('the user menu switches the theme', async ({ page }) => {
    await page.goto('/stats');
    await sidebar(page)
      .getByRole('button', { name: /Max Member/ })
      .click();
    const menu = page.getByRole('dialog', { name: 'User menu' });
    await menu.getByRole('button', { name: 'Dark' }).click();
    await expect(page.locator('html')).toHaveClass(/\bdark\b/);
    await menu.getByRole('button', { name: 'Light' }).click();
    await expect(page.locator('html')).not.toHaveClass(/\bdark\b/);
  });

  test('admin pages stay closed to members', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page).toHaveURL('/');
  });

  test('links to pages not built yet land on the overview', async ({
    page,
  }) => {
    await page.goto('/borrows');
    await expect(page).toHaveURL('/');
  });
});

test.describe('as an admin', () => {
  test.use({ storageState: authFile('admin') });

  test('sidebar shows the Admin section with review pills', async ({
    page,
  }) => {
    const a = expected.admin;
    await page.goto('/stats');
    const nav = sidebar(page);
    const admin = nav.getByRole('navigation', { name: 'Admin' });
    await expect(admin.getByRole('link', { name: 'Users' })).toBeVisible();
    await expect(
      admin.getByRole('link', {
        name: withBadge('Review materials', `${a.pendingMaterials} pending`),
      })
    ).toBeVisible();
    await expect(
      admin.getByRole('link', {
        name: withBadge('Review spool types', `${a.pendingSpoolTypes} pending`),
      })
    ).toBeVisible();
    // Nothing waits for the admin as a lender, and nothing is unread.
    await expect(
      nav.getByRole('link', { name: 'Borrows', exact: true })
    ).toBeVisible();
    await expect(
      nav.getByRole('link', { name: 'Notifications', exact: true })
    ).toBeVisible();
  });

  test('admin pages render inside the shell', async ({ page }) => {
    await page.goto('/admin/materials');
    await expect(
      sidebar(page).getByRole('link', { name: /^Review materials/ })
    ).toHaveAttribute('aria-current', 'page');
    await expect(
      page.getByRole('main').getByRole('heading', { level: 1 })
    ).toBeVisible();
  });
});

test.describe('signed out', () => {
  test('protected pages redirect to login, which has no shell', async ({
    page,
  }) => {
    await page.goto('/stats');
    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    await expect(page.locator('[data-slot=app-sidebar]')).toHaveCount(0);
    await expect(page.getByRole('navigation')).toHaveCount(0);
  });

  test('signing out from the user menu ends the session', async ({ page }) => {
    // A fresh session, so the saved ones other tests use stay valid.
    await signIn(page, 'member');
    await sidebar(page)
      .getByRole('button', { name: /Max Member/ })
      .click();
    await page
      .getByRole('dialog', { name: 'User menu' })
      .getByRole('button', { name: 'Sign out' })
      .click();
    await expect(page).toHaveURL('/login');
    await page.goto('/stats');
    await expect(page).toHaveURL('/login');
  });
});
