import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { fn } from 'storybook/test';

import { ThemeSwitch, type ThemeChoice } from './theme-switch';

const meta = {
  title: 'Shell/ThemeSwitch',
  component: ThemeSwitch,
  args: { value: 'system', onValueChange: fn() },
  render: function Render(args) {
    const [value, setValue] = useState(args.value);
    return (
      <div className="w-[216px]">
        <ThemeSwitch
          value={value}
          onValueChange={(next: ThemeChoice) => {
            setValue(next);
            args.onValueChange(next);
          }}
        />
      </div>
    );
  },
} satisfies Meta<typeof ThemeSwitch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Before next-themes has mounted nothing is pressed (no SSR mismatch). */
export const Unmounted: Story = { args: { value: undefined } };

export const Dark: Story = {
  args: { value: 'dark' },
  globals: { theme: 'dark' },
};
