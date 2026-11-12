import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { InitialsAvatar } from './initials-avatar';

const meta = {
  title: 'Design/InitialsAvatar',
  component: InitialsAvatar,
  args: { name: 'Anna Weber' },
} satisfies Meta<typeof InitialsAvatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The signed-in user is shown inverted. */
export const You: Story = { args: { name: 'Felix Kratz', you: true } };

/** In a member row (GroupSettings). */
export const InRow: Story = {
  render: () => (
    <div className="flex max-w-[520px] flex-col">
      <div className="flex items-center gap-3 py-3">
        <InitialsAvatar name="Felix Kratz" you />
        <span className="flex-1">
          Felix <span className="kicker">you</span>
        </span>
      </div>
      <div className="border-border flex items-center gap-3 border-t py-3">
        <InitialsAvatar name="Lena Schulz" />
        <span className="flex-1">Lena Schulz</span>
        <span className="kicker">joined Mar 2026 · shares 9</span>
      </div>
    </div>
  ),
};
