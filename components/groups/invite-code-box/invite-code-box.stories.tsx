import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { SectionHeader } from '@/components/common/section-header';

import { InviteCodeBox } from './invite-code-box';

const meta = {
  title: 'Design/InviteCodeBox',
  component: InviteCodeBox,
  args: {
    code: 'aB3xY9',
    link: 'https://spoolhouse.example.org/groups/join/aB3xY9',
    onRotate: fn(),
    onCopied: fn(),
    onCopyError: fn(),
  },
  decorators: [
    (Story) => (
      <div className="max-w-[440px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof InviteCodeBox>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The owner's view: copy and rotate. */
export const Owner: Story = {};

/** Members can share the link but not rotate it. */
export const Member: Story = { args: { onRotate: undefined } };

export const Rotating: Story = { args: { rotating: true } };

/** GroupSettings 03. */
export const InviteSection: Story = {
  render: (args) => (
    <section>
      <SectionHeader index="03" title="Invite link" />
      <InviteCodeBox {...args} />
    </section>
  ),
};
