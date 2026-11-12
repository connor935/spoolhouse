import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { DropletsIcon } from 'lucide-react';
import { fn } from 'storybook/test';
import { Badge } from './badge';

const TAG_VARIANTS = [
  'default',
  'muted',
  'accent',
  'accent-solid',
  'destructive',
  'destructive-outline',
  'inverted',
] as const;

const LEGACY_VARIANTS = ['outline', 'secondary', 'ghost', 'link'] as const;

const meta = {
  title: 'UI/Badge',
  component: Badge,
  args: { children: 'Low' },
  argTypes: {
    variant: {
      control: 'select',
      options: [...TAG_VARIANTS, ...LEGACY_VARIANTS],
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AsLink: Story = {
  args: {
    variant: 'accent',
    children: 'Pending review',
    render: <a href="/admin/materials?status=pending" />,
  },
};

/** The inventory "Dry?" tag: a real button, with pointer cursor and hover. */
export const Clickable: Story = {
  args: {
    variant: 'accent',
    children: (
      <>
        <DropletsIcon />
        Dry?
      </>
    ),
    render: <button type="button" onClick={fn()} />,
  },
};

/** Tags as they appear on the Inventory and AdminMaterials boards. */
export const InContext: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="destructive">Low</Badge>
      <Badge variant="muted">Empty</Badge>
      <Badge variant="accent">Lent · Jonas</Badge>
      <Badge>PETG</Badge>
      <Badge variant="accent-solid">Approved</Badge>
      <Badge variant="destructive-outline">Rejected</Badge>
      <Badge variant="inverted">Admin</Badge>
    </div>
  ),
};

export const AllVariants: Story = {
  render: (args) => (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        {TAG_VARIANTS.map((variant) => (
          <Badge key={variant} {...args} variant={variant}>
            {variant}
          </Badge>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {LEGACY_VARIANTS.map((variant) => (
          <Badge key={variant} {...args} variant={variant}>
            {variant}
          </Badge>
        ))}
      </div>
    </div>
  ),
};
