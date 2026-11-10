import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { SearchIcon } from 'lucide-react';
import { expect, fn, within } from 'storybook/test';
import { Input, InputGroup, InputGroupAddon, InputGroupInput } from './input';

const meta = {
  title: 'UI/Input',
  component: Input,
  args: {
    'aria-label': 'Measured total weight (g)',
    placeholder: 'e.g. 1193',
    onChange: fn(),
  },
  decorators: [
    (Story) => (
      <div className="w-72">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Ink: Story = {
  args: {
    variant: 'ink',
    'aria-label': 'Display name',
    placeholder: 'Your name',
  },
};

export const Focused: Story = {
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole('textbox');
    input.focus();
    await expect(input).toHaveFocus();
  },
};

export const Numeric: Story = {
  args: {
    type: 'number',
    inputMode: 'numeric',
    numeric: true,
    defaultValue: 935,
  },
};

export const Invalid: Story = {
  args: { 'aria-invalid': true, defaultValue: '1,75' },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: '193' },
};

/** Unit adornment, right-aligned mono value (`.inp.r` + `.unit`). */
export const WithUnit: Story = {
  render: (args) => (
    <InputGroup>
      <InputGroupInput
        numeric
        inputMode="numeric"
        defaultValue={1193}
        aria-label={args['aria-label']}
        onChange={args.onChange}
      />
      <InputGroupAddon>g</InputGroupAddon>
    </InputGroup>
  ),
};

export const WithCurrency: Story = {
  args: { 'aria-label': 'Price paid (€)' },
  render: (args) => (
    <InputGroup>
      <InputGroupInput
        numeric
        inputMode="decimal"
        placeholder="optional"
        aria-label={args['aria-label']}
      />
      <InputGroupAddon>€</InputGroupAddon>
    </InputGroup>
  ),
};

export const WithIcon: Story = {
  args: { 'aria-label': 'Search' },
  render: (args) => (
    <InputGroup variant="ink">
      <InputGroupAddon>
        <SearchIcon />
      </InputGroupAddon>
      <InputGroupInput
        type="search"
        placeholder="Search manufacturer, material or color…"
        aria-label={args['aria-label']}
      />
    </InputGroup>
  ),
};

export const WithUnitInvalid: Story = {
  render: (args) => (
    <InputGroup>
      <InputGroupInput
        numeric
        aria-invalid
        defaultValue="-4"
        aria-label={args['aria-label']}
      />
      <InputGroupAddon>g</InputGroupAddon>
    </InputGroup>
  ),
};

export const WithUnitDisabled: Story = {
  render: (args) => (
    <InputGroup>
      <InputGroupInput
        numeric
        disabled
        defaultValue={1000}
        aria-label={args['aria-label']}
      />
      <InputGroupAddon>g</InputGroupAddon>
    </InputGroup>
  ),
};
