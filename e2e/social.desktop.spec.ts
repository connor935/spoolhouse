import {
  expect,
  test,
  type Browser,
  type Locator,
  type Page,
} from '@playwright/test';
import { authFile } from './data';

// The whole social loop with two real sessions: a group is created, joined,
// shared from, lent from and torn down again. One serial test per area, all
// on a group this file creates, so the seeded counts the shell specs check
// are never touched.
test.describe.configure({ mode: 'serial' });

let lender: Page;
let borrower: Page;
let groupUrl = '';
let inviteCode = '';

async function open(browser: Browser, who: 'lender' | 'borrower') {
  const context = await browser.newContext({ storageState: authFile(who) });
  return context.newPage();
}

const region = (page: Page, name: string | RegExp) =>
  page.getByRole('region', { name });

const toast = (page: Page, text: string | RegExp) =>
  expect(
    page.locator('[data-sonner-toast]').filter({ hasText: text }).first()
  ).toBeVisible();

async function confirmDialog(page: Page, button: string) {
  await page.getByRole('dialog').getByRole('button', { name: button }).click();
}

const blackStock = (page: Page): Locator => region(page, 'Black');

test.beforeAll(async ({ browser }) => {
  lender = await open(browser, 'lender');
  borrower = await open(browser, 'borrower');
});

test.afterAll(async () => {
  await lender.context().close();
  await borrower.context().close();
});

test('create a group and join it by invite link', async () => {
  await lender.goto('/groups');
  await expect(lender.getByText(/not in any groups yet/i)).toBeVisible();
  await lender.getByLabel('Group name').fill('E2E Social');
  await lender.getByRole('button', { name: 'Create' }).click();
  await expect(lender).toHaveURL(/\/groups\/[\w-]+$/);
  groupUrl = new URL(lender.url()).pathname;
  inviteCode = (await lender
    .locator('[data-slot=invite-code]')
    .textContent())!.trim();

  await borrower.goto(`/groups/join/${inviteCode}`);
  await expect(
    borrower.getByRole('heading', { name: 'Join “E2E Social”?' })
  ).toBeVisible();
  await borrower.getByRole('button', { name: 'Join group' }).click();
  await expect(borrower).toHaveURL(groupUrl);
  // Sharing defaults to "all": the lender's Black spool is in the stock.
  await expect(
    blackStock(borrower).getByText('Lea Lender', { exact: true }).last()
  ).toBeVisible();
});

test('request, cancel, decline, then approve', async () => {
  const black = blackStock(borrower);
  await black.getByRole('button', { name: 'Request' }).click();
  await toast(borrower, 'Requested to borrow');
  await black.getByRole('button', { name: 'Cancel' }).click();
  await toast(borrower, 'Request cancelled');
  await black.getByRole('button', { name: 'Request' }).click();
  await expect(black.getByRole('button', { name: 'Cancel' })).toBeVisible();

  // Decline from the lender's Borrows page.
  await lender.goto('/borrows');
  const incoming = region(lender, 'Requests for your spools');
  await expect(incoming.getByText('Ben Borrower')).toBeVisible();
  await incoming.getByRole('button', { name: 'Decline' }).click();
  await toast(lender, 'Request declined');
  await expect(incoming.getByText(/nobody is waiting/i)).toBeVisible();

  // Ask again; this time approve from the notification.
  await borrower.reload();
  await blackStock(borrower).getByRole('button', { name: 'Request' }).click();
  await toast(borrower, 'Requested to borrow');
  await lender.goto('/notifications');
  await lender.getByRole('button', { name: 'Respond' }).first().click();
  await confirmDialog(lender, 'Approve');
  await toast(lender, 'Request approved');
});

test('active lend blocks delete and leave', async () => {
  await lender.goto(`${groupUrl}?view=settings`);
  await expect(
    lender.getByRole('button', { name: 'Delete group' })
  ).toBeDisabled();
  await expect(
    lender.getByText(/mark its active lends returned first/i)
  ).toBeVisible();
  await expect(
    lender.getByRole('button', { name: /remove ben borrower/i })
  ).toHaveAttribute('aria-disabled', 'true');

  await borrower.goto(`${groupUrl}?view=settings`);
  await expect(
    borrower.getByRole('button', { name: 'Leave group' })
  ).toBeDisabled();
});

test('borrower re-weighs, owner marks returned', async () => {
  await borrower.goto('/borrows');
  const borrowed = region(borrower, 'Borrowed by you');
  await expect(borrowed.getByText(/Lea Lender/)).toBeVisible();
  await borrowed.getByRole('button', { name: 'Weigh' }).click();
  // 250 g spool + 700 g filament at approval; 100 g printed since.
  await borrower.getByLabel('Measured total weight (g)').fill('850');
  await borrower.getByRole('button', { name: 'Save' }).click();
  await toast(borrower, 'Weight updated');

  await lender.goto('/borrows');
  const lentOut = region(lender, 'Lent out');
  await expect(lentOut.getByText(/−100 g so far/)).toBeVisible();
  await lentOut.getByRole('button', { name: 'Mark returned' }).click();
  await toast(lender, 'Marked as returned');
  const history = region(lender, 'History');
  await expect(history.getByText('Returned')).toBeVisible();
  await expect(history.getByText('−100 g')).toBeVisible();
});

test('rename, rotate the invite, and sharing changes what others see', async () => {
  await lender.goto(`${groupUrl}?view=settings`);
  const rename = lender.getByRole('textbox', { name: 'Name' });
  await rename.fill('E2E Social Club');
  await lender.getByRole('button', { name: 'Rename' }).click();
  await expect(
    lender.getByRole('heading', { level: 1, name: 'E2E Social Club' })
  ).toBeVisible();

  const oldCode = inviteCode;
  await lender.getByRole('button', { name: 'Rotate invite code' }).click();
  await confirmDialog(lender, 'Rotate');
  await expect(lender.locator('[data-slot=invite-code]')).not.toHaveText(
    oldCode
  );
  inviteCode = (await lender
    .locator('[data-slot=invite-code]')
    .textContent())!.trim();
  const dead = await borrower.goto(`/groups/join/${oldCode}`);
  expect(dead?.status()).toBe(404);

  // Whitelist with nothing on it: the lender shares no spools any more.
  await lender
    .getByRole('radio', { name: /share only selected materials/i })
    .click();
  await lender.getByRole('button', { name: 'Save sharing settings' }).click();
  await toast(lender, 'Sharing settings saved');
  await borrower.goto(groupUrl);
  await expect(borrower.getByText('Ben Borrower').first()).toBeVisible();
  await expect(blackStock(borrower)).toHaveCount(0);
});

test('remove, rejoin, leave, delete', async () => {
  await lender.goto(`${groupUrl}?view=settings`);
  await lender.getByRole('button', { name: /remove ben borrower/i }).click();
  await confirmDialog(lender, 'Remove');
  await toast(lender, 'Member removed');
  await expect(
    lender.getByRole('button', { name: /remove ben borrower/i })
  ).toHaveCount(0);

  await borrower.goto(`/groups/join/${inviteCode}`);
  await borrower.getByRole('button', { name: 'Join group' }).click();
  await expect(borrower).toHaveURL(groupUrl);
  await borrower.goto(`${groupUrl}?view=settings`);
  await borrower.getByRole('button', { name: 'Leave group' }).click();
  await confirmDialog(borrower, 'Leave group');
  await expect(borrower).toHaveURL('/groups');

  await lender.goto(`${groupUrl}?view=settings`);
  await lender.getByRole('button', { name: 'Delete group' }).click();
  await confirmDialog(lender, 'Delete group');
  await expect(lender).toHaveURL('/groups');
  await expect(lender.getByText(/not in any groups yet/i)).toBeVisible();
});
