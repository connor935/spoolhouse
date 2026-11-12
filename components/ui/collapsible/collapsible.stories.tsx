import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ChevronDownIcon } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './collapsible';

type Args = { defaultOpen?: boolean };

const meta = {
  title: 'UI/Collapsible',
  // e.g. the optional "Details" section of the spool form.
  render: ({ defaultOpen }) => (
    <Collapsible defaultOpen={defaultOpen} className="w-80">
      <CollapsibleTrigger className="group flex w-full items-center gap-2 py-2 text-left">
        <span className="display-section">Details</span>
        <span className="kicker">optional</span>
        <ChevronDownIcon
          aria-hidden
          className="text-muted-foreground ml-auto size-4 transition-transform group-data-panel-open:rotate-180"
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <p className="text-muted-foreground pt-2 text-sm">
          Price paid, purchase date, location and last dried.
        </p>
      </CollapsibleContent>
    </Collapsible>
  ),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};

export const Open: Story = { args: { defaultOpen: true } };
