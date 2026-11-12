import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { RequestSubmitButton } from './request-submit-button';

const meta = {
  title: 'Design/RequestSubmitButton',
  component: RequestSubmitButton,
  args: { isAdmin: false, pending: false },
} satisfies Meta<typeof RequestSubmitButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Regular user: the entry goes to the review queue. */
export const Request: Story = { args: { noun: 'material' } };

/** Admins (and trusted contributors) add directly. */
export const Add: Story = { args: { isAdmin: true, noun: 'material' } };

export const Pending: Story = { args: { pending: true } };

/** Inline mini-form: plain button, no noun, small. */
export const Inline: Story = {
  args: { size: 'sm', onClick: () => {} },
};
