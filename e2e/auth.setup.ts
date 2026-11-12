import { test as setup } from '@playwright/test';
import { authFile } from './data';
import { signIn } from './helpers';

// Signs each seeded user in once; the specs reuse the saved sessions.
for (const who of ['member', 'admin', 'lender', 'borrower'] as const) {
  setup(`sign in as ${who}`, async ({ page }) => {
    await signIn(page, who);
    await page.context().storageState({ path: authFile(who) });
  });
}
