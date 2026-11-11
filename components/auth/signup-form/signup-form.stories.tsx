import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { SignupForm } from './signup-form';

const meta = {
  title: 'Pages/SignUp',
  component: SignupForm,
  parameters: { layout: 'centered' },
  args: { minLength: 12, onSubmit: fn() },
} satisfies Meta<typeof SignupForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Failed: Story = {
  args: { error: 'User already exists' },
};

export const Mobile: Story = {
  globals: { viewport: { value: 'mobile' } },
};
