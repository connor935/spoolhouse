import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { ResetPasswordForm } from './reset-password-form';

const meta = {
  title: 'Pages/SetNewPassword',
  component: ResetPasswordForm,
  parameters: { layout: 'centered' },
  args: { minLength: 12, hasToken: true, onSubmit: fn() },
} satisfies Meta<typeof ResetPasswordForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const InvalidLink: Story = { args: { hasToken: false } };

export const Expired: Story = {
  args: { error: 'Reset failed — the link may have expired.' },
};
