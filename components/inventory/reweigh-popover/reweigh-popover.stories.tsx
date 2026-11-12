import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import * as React from 'react';
import { fn } from 'storybook/test';
import { daysAgo, FIXTURE_NOW, spools } from '@/stories/fixtures/inventory';
import { SpoolTile } from '../spool-tile';
import { ReweighPopover } from './reweigh-popover';

type Args = {
  defaultOpen: boolean;
  onSave: (grams: number) => void;
  onEditDetails: () => void;
};

/** A tile that opens the popover, the way the inventory page wires it. */
function Demo({ defaultOpen, onSave, onEditDetails }: Args) {
  const [open, setOpen] = React.useState(defaultOpen);
  const [anchor, setAnchor] = React.useState<HTMLDivElement | null>(null);
  return (
    <div className="pb-[360px]">
      <SpoolTile
        ref={setAnchor}
        spool={spools.full}
        number={3}
        selected={open}
        onSelect={() => setOpen(true)}
      />
      <ReweighPopover
        open={open && anchor !== null}
        onOpenChange={setOpen}
        anchor={anchor}
        title="Re-weigh #03 Galaxy Black"
        spool={spools.full}
        lastWeighedAt={daysAgo(14)}
        now={FIXTURE_NOW}
        onSave={(grams) => {
          onSave(grams);
          setOpen(false);
        }}
        onEditDetails={onEditDetails}
      />
    </div>
  );
}

const meta = {
  title: 'Design/ReweighPopover',
  component: Demo,
  args: { defaultOpen: false, onSave: fn(), onEditDetails: fn() },
} satisfies Meta<typeof Demo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};

export const Open: Story = { args: { defaultOpen: true } };
