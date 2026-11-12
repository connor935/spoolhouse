import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { LoginForm } from './login-form';

const meta = {
  title: 'Pages/SignIn',
  component: LoginForm,
  parameters: { layout: 'centered' },
  args: { showSignup: false, onSubmit: fn() },
} satisfies Meta<typeof LoginForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Registration closed (the default): no sign-up link. */
export const Default: Story = {};

export const SignupOpen: Story = { args: { showSignup: true } };

export const Failed: Story = {
  args: { error: 'Invalid email or password' },
};

export const Pending: Story = { args: { pending: true } };
