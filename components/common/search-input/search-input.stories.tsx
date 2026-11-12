import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { fn } from 'storybook/test';

import { SearchInput } from './search-input';

const meta = {
  title: 'Design/SearchInput',
  component: SearchInput,
  args: {
    value: '',
    onChange: fn(),
    placeholder: 'Search materials…',
    ariaLabel: 'Search materials',
  },
  // Controlled input: keep the typed value in story state.
  render: function Render(args) {
    const [value, setValue] = useState(args.value);
    return (
      <SearchInput
        {...args}
        value={value}
        onChange={(v) => {
          setValue(v);
          args.onChange(v);
        }}
      />
    );
  },
} satisfies Meta<typeof SearchInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Page search: "/" focuses it, with the key hint shown. */
export const WithShortcut: Story = { args: { shortcut: true } };

export const Filled: Story = { args: { value: 'polymaker petg' } };
