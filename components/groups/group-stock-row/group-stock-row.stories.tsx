import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { Swatch } from '@/components/inventory/swatch';
import { Badge } from '@/components/ui/badge';
import { ME, stock } from '@/stories/fixtures/social';

import { GroupStockRow } from './group-stock-row';

const meta = {
  title: 'Design/GroupStockRow',
  component: GroupStockRow,
  args: {
    spool: stock.available,
    number: 2,
    currentUserId: ME.id,
    onRequest: fn(),
    onCancelRequest: fn(),
    onMarkReturned: fn(),
  },
  // Rows are <li>s; the material group owns the list.
  render: (args) => (
    <ul className="m-0 max-w-[900px] list-none p-0">
      <GroupStockRow {...args} />
    </ul>
  ),
} satisfies Meta<typeof GroupStockRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Available: Story = {};

export const AvailablePending: Story = { args: { pending: true } };

export const RequestedByYou: Story = {
  args: { spool: stock.requestedByYou, number: 5 },
};

export const RequestedByOther: Story = {
  args: { spool: stock.requestedByOther, number: 1 },
};

export const WithYou: Story = {
  args: {
    spool: stock.withYou,
    number: 4,
    lentSince: new Date('2026-11-07T10:00:00Z'),
  },
};

export const LentToOther: Story = {
  args: { spool: stock.lentToOther, number: 1 },
};

export const Own: Story = { args: { spool: stock.own, number: 1 } };

export const OwnRequested: Story = {
  args: { spool: stock.ownRequested, number: 3 },
};

export const OwnLent: Story = { args: { spool: stock.ownLent, number: 2 } };

/** A material group on the Group board, every viewer state in one list. */
export const MaterialGroup: Story = {
  render: (args) => (
    <section className="max-w-[900px]">
      <div className="flex items-center gap-3 py-3">
        <Swatch color={stock.own.material.color} size="md" decorative />
        <span className="display-name text-xl">{stock.own.material.name}</span>
        <Badge>{stock.own.material.filamentType}</Badge>
        <span className="kicker">{stock.own.material.manufacturer}</span>
      </div>
      <ul className="m-0 list-none p-0">
        {(
          [
            [Own, stock.own, 1],
            [RequestedByYou, stock.requestedByYou, 5],
            [Available, stock.available, 2],
            [OwnRequested, stock.ownRequested, 3],
            [WithYou, stock.withYou, 4],
            [RequestedByOther, stock.requestedByOther, 1],
            [OwnLent, stock.ownLent, 2],
            [LentToOther, stock.lentToOther, 1],
          ] as const
        ).map(([story, spool, number]) => (
          <GroupStockRow
            key={
              spool.lentTo?.lendId ??
              spool.pendingRequest?.lendId ??
              `${spool.ownerId}-${spool.id}`
            }
            {...args}
            {...story.args}
            spool={spool}
            number={number}
          />
        ))}
      </ul>
    </section>
  ),
};

export const Mobile: Story = {
  ...MaterialGroup,
  globals: { viewport: { value: 'mobile' } },
};
