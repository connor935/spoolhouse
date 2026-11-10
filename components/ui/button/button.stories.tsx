import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import { fn } from 'storybook/test';
import { Kbd } from '../kbd';
import { Button } from './button';

const VARIANTS = [
  'default',
  'accent',
  'outline',
  'secondary',
  'ghost',
  'destructive',
  'destructive-outline',
  'link',
] as const;

const SIZES = ['xs', 'sm', 'default', 'lg'] as const;

const meta = {
  title: 'UI/Button',
  component: Button,
  args: { children: 'Add spool', onClick: fn() },
  argTypes: {
    variant: { control: 'select', options: VARIANTS },
    size: {
      control: 'select',
      options: [...SIZES, 'icon', 'icon-xs', 'icon-sm', 'icon-lg'],
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Accent: Story = { args: { variant: 'accent' } };

export const Disabled: Story = { args: { disabled: true } };

export const WithIcon: Story = {
  args: {
    children: (
      <>
        <PlusIcon data-icon="inline-start" />
        Add spool
      </>
    ),
  },
};

/** The dashboard header CTA: icon, label and its keyboard shortcut. */
export const WithShortcut: Story = {
  args: {
    variant: 'accent',
    'aria-keyshortcuts': 'N',
    children: (
      <>
        <PlusIcon data-icon="inline-start" />
        Add spool
        <Kbd aria-hidden>N</Kbd>
      </>
    ),
  },
};

export const IconOnly: Story = {
  args: {
    size: 'icon',
    variant: 'ghost',
    'aria-label': 'Delete spool',
    children: <Trash2Icon />,
  },
};

/** Confirm-dialog footer pairing (Patterns board, section 02). */
export const DestructiveConfirm: Story = {
  render: (args) => (
    <div className="flex gap-2">
      <Button {...args} variant="outline" size="sm">
        Cancel
      </Button>
      <Button {...args} variant="destructive" size="sm">
        Delete spool
      </Button>
    </div>
  ),
};

export const AllVariants: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      {VARIANTS.map((variant) => (
        <Button key={variant} {...args} variant={variant}>
          {variant}
        </Button>
      ))}
    </div>
  ),
};

export const AllSizes: Story = {
  render: (args) => (
    <div className="flex flex-col gap-4">
      {(['default', 'accent', 'outline'] as const).map((variant) => (
        <div key={variant} className="flex flex-wrap items-center gap-3">
          {SIZES.map((size) => (
            <Button key={size} {...args} variant={variant} size={size}>
              {size}
            </Button>
          ))}
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-3">
        {(['icon-xs', 'icon-sm', 'icon', 'icon-lg'] as const).map((size) => (
          <Button
            key={size}
            {...args}
            variant="ghost"
            size={size}
            aria-label={`Delete (${size})`}
          >
            <Trash2Icon />
          </Button>
        ))}
      </div>
    </div>
  ),
};
