import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { AccountView } from './account-view';

const NOW = new Date('2026-11-11T12:00:00Z');
const ago = (ms: number) => new Date(NOW.getTime() - ms);
const MIN = 60_000;
const DAY = 24 * 60 * MIN;

const resolved = () => fn(async () => true);

const meta = {
  title: 'Pages/Account',
  component: AccountView,
  parameters: { layout: 'padded' },
  args: {
    name: 'Felix',
    isAdmin: true,
    memberSince: new Date('2026-01-14T10:00:00Z'),
    minLength: 12,
    now: NOW,
    tokens: [
      {
        id: 'tok-1',
        name: 'Scale script',
        createdAt: new Date('2026-11-10T09:00:00Z'),
        lastUsedAt: null,
      },
      {
        id: 'tok-2',
        name: 'Home Assistant',
        createdAt: new Date('2026-04-02T09:00:00Z'),
        lastUsedAt: ago(12 * MIN),
      },
      {
        id: 'tok-3',
        name: 'NFC reader',
        createdAt: new Date('2026-01-18T09:00:00Z'),
        lastUsedAt: ago(95 * DAY),
      },
    ],
    createdToken: null,
    onSaveName: resolved(),
    onChangePassword: resolved(),
    onCreateToken: resolved(),
    onCopyToken: fn(),
    onRevokeToken: fn(),
  },
} satisfies Meta<typeof AccountView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Right after "Create token": the plaintext, shown this once. */
export const TokenCreated: Story = {
  args: {
    createdToken: {
      name: 'Scale script',
      token: 'sph_7Kd9qXw2mT4nV8bR1pLz6cYe3uHs0aJf',
    },
  },
};

export const Copied: Story = {
  args: { ...TokenCreated.args, copied: true },
};

export const Member: Story = {
  args: { name: 'Anna Weber', isAdmin: false, tokens: [] },
};

export const Mobile: Story = {
  args: TokenCreated.args,
  globals: { viewport: { value: 'mobile' } },
};
