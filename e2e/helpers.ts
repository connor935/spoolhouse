import { expect, type Page } from '@playwright/test';
import { E2E_PASSWORD, users } from './data';

/**
 * Signs in through the real login form and waits for the shell. better-auth
 * allows 3 sign-ins per 10 s per IP, and the setup signs in more users than
 * that at once, so a rate-limited attempt waits out the window and retries.
 */
export async function signIn(page: Page, who: keyof typeof users) {
  const tooMany = page.getByText(/too many requests/i);
  for (let attempt = 0; ; attempt++) {
    await page.goto('/login');
    await page.getByLabel('Email').fill(users[who].email);
    await page.getByLabel('Password').fill(E2E_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    // The login page has its own <main>, so wait for leaving it or the error.
    await expect
      .poll(
        async () =>
          new URL(page.url()).pathname !== '/login' ||
          (await tooMany.isVisible())
      )
      .toBe(true);
    if (attempt < 2 && (await tooMany.isVisible())) {
      await page.waitForTimeout(11_000);
      continue;
    }
    break;
  }
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('main')).toBeVisible();
}

/** A nav link whose name is "<label>, <badge label>" (the badge is sr-only text). */
export const withBadge = (label: string, badge: string) =>
  new RegExp(`^${label}\\s*, ${badge}$`);

export const sidebar = (page: Page) => page.locator('[data-slot=app-sidebar]');
