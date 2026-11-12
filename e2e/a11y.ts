import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';
import { authFile } from './data';

// Automated WCAG 2.2 AA scan (axe-core) of every page, in light and dark.
// Shared by a11y.desktop.spec.ts and a11y.mobile.spec.ts, so each route is
// checked at 1440px and at the 390px of the mobile design boards. Read-only:
// it only navigates, so the seed stays what the other specs expect.

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/** Routes with an id, resolved from links on their list page. */
async function firstHref(page: Page, listPath: string, pattern: RegExp) {
  await page.goto(listPath);
  const hrefs = await page
    .locator('a[href]')
    .evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? ''));
  const href = hrefs.find((h) => pattern.test(h));
  if (!href) throw new Error(`no link matching ${pattern} on ${listPath}`);
  return href;
}

async function scan(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator('body')).toBeVisible();
  // Let fonts settle: contrast checks read computed colours.
  await page.evaluate(() => document.fonts.ready);
  const { violations } = await new AxeBuilder({ page })
    .withTags(TAGS)
    .analyze();
  const report = violations.map((v) => ({
    rule: v.id,
    impact: v.impact,
    help: v.help,
    nodes: v.nodes.slice(0, 5).map((n) => n.target.join(' ')),
  }));
  expect(report, `${path}: axe violations`).toEqual([]);
}

const signedInRoutes = [
  '/',
  '/inventory',
  '/inventory?status=empty',
  '/borrows',
  '/groups',
  '/stats',
  '/notifications',
  '/materials',
  '/spool-types',
  '/account',
  '/admin/users',
  '/admin/materials',
  '/admin/materials/review',
  '/admin/spool-types',
  '/admin/spool-types/review',
  '/admin/properties',
  '/admin/import',
  '/this-page-does-not-exist',
];

const publicRoutes = ['/login', '/forgot-password', '/reset-password'];

export function a11ySuite() {
  for (const scheme of ['light', 'dark'] as const) {
    test.describe(`${scheme} mode`, () => {
      test.use({ colorScheme: scheme });

      test.describe('signed in as admin', () => {
        // Admin sees every nav entry and the admin pages.
        test.use({ storageState: authFile('admin') });

        for (const path of signedInRoutes) {
          test(`${path} has no axe violations`, async ({ page }) => {
            await scan(page, path);
          });
        }

        test('group detail (stock + settings) has no axe violations', async ({
          page,
        }) => {
          const group = await firstHref(page, '/groups', /^\/groups\/[^/]+$/);
          await scan(page, group);
          await scan(page, `${group}?view=settings`);
        });

        test('material detail has no axe violations', async ({ page }) => {
          // Desktop: the material header button; mobile: the card's
          // "Material details" button below its rows.
          await page.goto('/inventory');
          await page
            .locator('[data-slot=material-block]')
            .first()
            .getByRole('button', { name: /^(Open |Material details)/ })
            .click();
          await expect(page).toHaveURL(/\/materials\/[^/?]+(\?|$)/);
          const url = new URL(page.url());
          await scan(page, url.pathname + url.search);
        });
      });

      test.describe('signed out', () => {
        test.use({ storageState: { cookies: [], origins: [] } });
        for (const path of publicRoutes) {
          test(`${path} has no axe violations`, async ({ page }) => {
            await scan(page, path);
          });
        }
      });
    });
  }
}
