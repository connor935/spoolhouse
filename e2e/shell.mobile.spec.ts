import { expect, test } from '@playwright/test';
import { authFile, expected } from './data';
import { withBadge } from './helpers';

test.use({ storageState: authFile('member') });

const bottomNav = (page: import('@playwright/test').Page) =>
  page.locator('[data-slot=bottom-nav]');

test('top bar and bottom nav replace the sidebar', async ({ page }) => {
  await page.goto('/stats');
  await expect(page.locator('[data-slot=app-sidebar]')).toBeHidden();
  await expect(page.locator('[data-slot=mobile-top-bar]')).toBeVisible();
  await expect(
    page.getByRole('link', {
      name: `Notifications, ${expected.member.unread} unread`,
    })
  ).toBeVisible();

  const nav = bottomNav(page);
  await expect(nav.getByRole('link')).toHaveCount(5);
  await expect(nav.getByRole('link', { name: 'Stats' })).toHaveAttribute(
    'aria-current',
    'page'
  );
  await expect(
    nav.getByRole('link', {
      name: withBadge(
        'Borrows',
        `${expected.member.borrowRequests} open request`
      ),
    })
  ).toBeVisible();
});

test('the bottom nav navigates and marks group pages as Groups', async ({
  page,
}) => {
  await page.goto('/stats');
  await bottomNav(page).getByRole('link', { name: 'Groups' }).tap();
  await expect(page).toHaveURL('/groups');
  await expect(
    bottomNav(page).getByRole('link', { name: 'Groups' })
  ).toHaveAttribute('aria-current', 'page');

  await page
    .getByRole('main')
    .getByRole('link', { name: /E2E Makers/ })
    .first()
    .tap();
  await expect(page).toHaveURL(/\/groups\/[\w-]+$/);
  await expect(
    bottomNav(page).getByRole('link', { name: 'Groups' })
  ).toHaveAttribute('aria-current', 'page');
});

test('the drawer opens from the top bar and closes after navigating', async ({
  page,
}) => {
  await page.goto('/stats');
  await page.getByRole('button', { name: 'Open navigation' }).tap();
  const drawer = page.getByRole('dialog', { name: 'Navigation' });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole('navigation', { name: 'Admin' })).toHaveCount(
    0
  );
  await expect(drawer.getByRole('group', { name: 'Theme' })).toBeVisible();

  await drawer.getByRole('link', { name: 'Materials' }).tap();
  await expect(page).toHaveURL('/materials');
  await expect(drawer).toBeHidden();
});
