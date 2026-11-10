import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { spools } from '@/stories/fixtures/inventory';
import { AddSpoolTile, SpoolTile } from './spool-tile';

const meta = {
  title: 'Design/SpoolTile',
  component: SpoolTile,
  args: {
    spool: spools.inUse,
    number: 1,
    onSelect: fn(),
    onEdit: fn(),
    onMarkDried: fn(),
  },
} satisfies Meta<typeof SpoolTile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InUse: Story = {};

export const Lent: Story = { args: { spool: spools.lent, number: 2 } };

export const Full: Story = { args: { spool: spools.full, number: 3 } };

export const Low: Story = { args: { spool: spools.low, number: 1 } };

/** "Dry?" is its own button; clicking it never re-weighs. */
export const NeedsDrying: Story = { args: { spool: spools.dry, number: 1 } };

export const Empty: Story = { args: { spool: spools.empty, number: 1 } };

export const Requested: Story = {
  args: { spool: spools.inUse, number: 1, requestedByName: 'Anna' },
};

export const Borrowed: Story = {
  args: {
    spool: spools.inUse,
    number: 4,
    borrowedFromName: 'Mia',
    onEdit: undefined,
  },
};

export const Selected: Story = {
  args: { spool: spools.full, number: 3, selected: true },
};

/** Material detail page: wider, with spool type, price and purchase date. */
export const WithDetails: Story = {
  args: { spool: spools.inUse, number: 1, details: true },
};

/** Without `onSelect` the tile is plain content (e.g. someone else's spool). */
export const Static: Story = {
  args: { onSelect: undefined, onEdit: undefined, onMarkDried: undefined },
};

export const AddTile: Story = {
  render: () => <AddSpoolTile onClick={fn()} />,
};

export const AllStates: Story = {
  render: (args) => (
    <div className="flex max-w-[860px] flex-wrap gap-2.5">
      <SpoolTile {...args} spool={spools.inUse} number={1} />
      <SpoolTile {...args} spool={spools.lent} number={2} />
      <SpoolTile {...args} spool={spools.full} number={3} selected />
      <SpoolTile {...args} spool={spools.low} number={1} />
      <SpoolTile {...args} spool={spools.dry} number={1} />
      <SpoolTile {...args} spool={spools.empty} number={1} />
      <SpoolTile
        {...args}
        spool={spools.inUse}
        number={1}
        requestedByName="Anna"
      />
      <AddSpoolTile />
    </div>
  ),
};
