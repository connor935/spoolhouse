import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { fn } from 'storybook/test';
import { PasswordField } from './password-field';

const meta = {
  title: 'Design/PasswordField',
  component: PasswordField,
  parameters: { layout: 'padded' },
  args: {
    label: 'New password',
    value: '',
    onChange: fn(),
    autoComplete: 'new-password',
    minLength: 12,
  },
  // Controlled: keep the typed value so the counter moves.
  render: function Render(args) {
    const [value, setValue] = useState(args.value);
    return (
      <div className="max-w-sm">
        <PasswordField
          {...args}
          value={value}
          onChange={(v) => {
            setValue(v);
            args.onChange(v);
          }}
        />
      </div>
    );
  },
} satisfies Meta<typeof PasswordField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** "14 / 12" on the Auth board: long enough, counter in accent. */
export const LongEnough: Story = { args: { value: 'correct-horse!' } };

export const Mismatch: Story = {
  args: {
    label: 'Repeat',
    value: 'something-else',
    minLength: undefined,
    error: "Passwords don't match.",
  },
};

/** Admin's temporary password: visible, with the minimum as help text. */
export const Temporary: Story = {
  args: {
    label: 'Temporary password',
    type: 'text',
    autoComplete: 'off',
    description: 'At least 12 characters. They can change it under Account.',
  },
};
