import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { UsersView } from './users-view';

const user = (
  id: string,
  name: string,
  spoolCount: number,
  over: { isAdmin?: boolean; trustedContributor?: boolean } = {}
) => ({
  id,
  name,
  email: `${name.split(' ')[0].toLowerCase()}@example.org`,
  isAdmin: false,
  trustedContributor: false,
  spoolCount,
  ...over,
});

const meta = {
  title: 'Pages/AdminUsers',
  component: UsersView,
  parameters: { layout: 'padded' },
  args: {
    users: [
      user('u-felix', 'Felix', 19, { isAdmin: true }),
      user('u-anna', 'Anna Weber', 11, { trustedContributor: true }),
      user('u-jonas', 'Jonas Brandt', 14, { trustedContributor: true }),
      user('u-mia', 'Mia Koch', 6),
      user('u-tom', 'Tom Richter', 4),
      user('u-lena', 'Lena Schulz', 0),
    ],
    currentUserId: 'u-felix',
    minLength: 12,
    signupOpen: false,
    onTrustedChange: fn(),
    onCreateUser: fn(async () => true),
  },
} satisfies Meta<typeof UsersView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SavingTrusted: Story = {
  args: { pendingTrustedId: 'u-mia' },
};

export const SignupOpen: Story = { args: { signupOpen: true } };

export const Mobile: Story = {
  globals: { viewport: { value: 'mobile' } },
};
