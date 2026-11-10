import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { PlusIcon } from 'lucide-react';
import { Button } from '../button';
import { Kbd } from './kbd';

const meta = {
  title: 'UI/Kbd',
  component: Kbd,
  args: { children: 'N' },
} satisfies Meta<typeof Kbd>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Combination: Story = {
  render: (args) => (
    <span className="text-muted-foreground inline-flex items-center gap-1 text-sm">
      Press <Kbd {...args}>⌘</Kbd>
      <Kbd {...args}>K</Kbd> to search
    </span>
  ),
};

/** Inherits the button's text colour on every variant. */
export const InButtons: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      {(['accent', 'default', 'outline', 'ghost'] as const).map((variant) => (
        <Button key={variant} variant={variant} aria-keyshortcuts="N">
          <PlusIcon data-icon="inline-start" />
          Add spool
          <Kbd {...args} aria-hidden />
        </Button>
      ))}
    </div>
  ),
};
