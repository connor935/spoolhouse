import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { ForgotPasswordForm } from './forgot-password-form';

const meta = {
  title: 'Pages/ResetRequest',
  component: ForgotPasswordForm,
  parameters: { layout: 'centered' },
  args: { onSubmit: fn() },
} satisfies Meta<typeof ForgotPasswordForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Sent: Story = { args: { sent: true } };
