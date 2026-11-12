import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { materials } from '@/stories/fixtures/inventory';
import { ME, people, stock } from '@/stories/fixtures/social';
import type { SharedSpool } from '@/lib/sharing';
import { GroupStockView } from './group-stock-view';

const as = (
  spool: SharedSpool,
  id: string,
  material: SharedSpool['material']
): SharedSpool => ({ ...spool, id, material });

// The Group board: Galaxy Black across three owners, plus a few more
// materials so grouping, states and "Load more" all show up.
const boardStock: SharedSpool[] = [
  as(stock.own, 'spool-black-me', materials.galaxyBlack),
  as(stock.requestedByYou, 'spool-black-jonas', materials.galaxyBlack),
  as(stock.available, 'spool-black-anna', materials.galaxyBlack),
  as(stock.withYou, 'spool-cyan-mia', materials.basicCyan),
  as(stock.lentToOther, 'spool-cyan-tom', materials.basicCyan),
  as(stock.requestedByOther, 'spool-red-anna', materials.fireEngineRed),
  as(stock.ownRequested, 'spool-orange-me', materials.prusaOrange),
  as(stock.ownLent, 'spool-orange-me-2', materials.prusaOrange),
];

const meta = {
  title: 'Pages/Group/Stock',
  component: GroupStockView,
  parameters: { layout: 'padded' },
  args: {
    stock: boardStock,
    spoolNumbers: Object.fromEntries(boardStock.map((s, i) => [s.id, i + 1])),
    currentUserId: ME.id,
    members: [
      { id: ME.id, name: ME.name, role: 'member', sharedCount: 3 },
      {
        id: people.anna.id,
        name: people.anna.name,
        role: 'owner',
        sharedCount: 2,
      },
      {
        id: people.jonas.id,
        name: people.jonas.name,
        role: 'member',
        sharedCount: 1,
      },
      {
        id: people.mia.id,
        name: people.mia.name,
        role: 'member',
        sharedCount: 1,
      },
      {
        id: people.tom.id,
        name: people.tom.name,
        role: 'member',
        sharedCount: 1,
      },
    ],
    mySharing: { mode: 'whitelist', visible: 6, total: 14 },
    settingsHref: '/groups/group-farm?view=settings',
    onRequest: fn(),
    onCancelRequest: fn(),
    onMarkReturned: fn(),
  },
} satisfies Meta<typeof GroupStockView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Two materials per page, to show "Load more". */
export const Paged: Story = { args: { pageSize: 2 } };

export const Empty: Story = { args: { stock: [] } };

export const Mobile: Story = {
  globals: { viewport: { value: 'mobile' } },
};
