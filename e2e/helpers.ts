import { expect, type Page } from '@playwright/test';
import { E2E_PASSWORD, users } from './data';

/** Signs in through the real login form and waits for the shell. */
export async function signIn(page: Page, who: keyof typeof users) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(users[who].email);
  await page.getByLabel('Password').fill(E2E_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('main')).toBeVisible();
}

/** A nav link whose name is "<label>, <badge label>" (the badge is sr-only text). */
export const withBadge = (label: string, badge: string) =>
  new RegExp(`^${label}\\s*, ${badge}$`);

export const sidebar = (page: Page) => page.locator('[data-slot=app-sidebar]');
