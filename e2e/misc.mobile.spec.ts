import { expect, test, type Page } from '@playwright/test';
import { authFile } from './data';

// The 06d pages at 390 px: nothing may push the page wider than the screen.

const noHorizontalScroll = (page: Page) =>
  expect
    .poll(() =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth
      )
    )
    .toBe(true);

test.describe('as a member', () => {
  test.use({ storageState: authFile('member') });

  for (const path of ['/stats', '/account', '/no-such-shelf']) {
    test(`${path} fits the screen`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await noHorizontalScroll(page);
    });
  }
});

test.describe('as an admin', () => {
  test.use({ storageState: authFile('admin') });

  for (const path of ['/admin/users', '/admin/properties']) {
    test(`${path} fits the screen`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await noHorizontalScroll(page);
    });
  }
});

test.describe('signed out', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  for (const path of ['/login', '/forgot-password']) {
    test(`${path} fits the screen`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await noHorizontalScroll(page);
    });
  }
});
