import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import type { ActivityEvent } from '@/lib/activity';
import {
  dryingList,
  runningLow,
  stockSummary,
  stockValue,
} from '@/lib/overview';
import { FIXTURE_NOW, daysAgo, inventory } from '@/stories/fixtures/inventory';
import { memberCounts } from '@/stories/fixtures/nav';
import { monthlyUsage } from '@/stories/fixtures/usage';
import { OverviewView } from './overview-view';

const minutesAgo = (m: number) =>
  new Date(FIXTURE_NOW.getTime() - m * 60 * 1000);

const activity: ActivityEvent[] = [
  {
    kind: 'weigh',
    id: 'w:1',
    at: minutesAgo(30),
    spoolId: 'spool-gb-1',
    materialName: 'Galaxy Black',
    leftGrams: 742,
    deltaGrams: -58,
    byName: null,
  },
  {
    kind: 'lend',
    id: 'l:1:requested',
    at: minutesAgo(140),
    event: 'requested',
    lendId: 'lend-1',
    spoolId: 'spool-po-2',
    materialName: 'Prusa Orange',
    role: 'owner',
    otherName: 'Anna Weber',
    pending: true,
  },
  {
    kind: 'lend',
    id: 'l:2:approved',
    at: daysAgo(1),
    event: 'approved',
    lendId: 'lend-2',
    spoolId: 'spool-mia-4',
    materialName: 'Basic Cyan',
    role: 'borrower',
    otherName: 'Mia Koch',
    pending: false,
  },
];

const meta = {
  title: 'Pages/Overview',
  component: OverviewView,
  args: {
    dateLine: 'Tue 10 Nov 2026 · last weighing 11:30',
    summary: stockSummary(inventory),
    value: stockValue(inventory),
    usage: {
      delta: { last30Grams: 1180, prev30Grams: 1341, deltaPct: -12 },
      monthly: monthlyUsage,
    },
    runningLow: runningLow(inventory, { 'mat-prusa-orange': 20 }),
    drying: dryingList(inventory, FIXTURE_NOW),
    activity,
    spoolNumbers: { 'spool-gb-1': 1, 'spool-po-2': 2 },
    now: FIXTURE_NOW,
    timeZone: 'UTC',
    request: {
      lendId: 'lend-1',
      spool: { materialName: 'Prusa Orange', color: '#F26A21', number: 2 },
      counterpartName: 'Anna Weber',
      groupName: 'Print Farm Friends',
      time: '3 h ago',
      filamentLeftGrams: 655,
    },
    requestCount: 1,
    lends: [
      {
        lendId: 'lend-3',
        direction: 'out',
        spoolId: 'spool-gb-2',
        spool: { materialName: 'Galaxy Black', color: '#1B1B1F', number: 2 },
        counterpartName: 'Jonas',
        since: daysAgo(29),
      },
      {
        lendId: 'lend-2',
        direction: 'in',
        spoolId: 'spool-mia-4',
        spool: { materialName: 'Basic Cyan', color: '#00AEEF', number: 4 },
        counterpartName: 'Mia Koch',
        since: daysAgo(1),
      },
    ],
    groups: memberCounts.groups,
    onAddSpool: fn(),
    onApprove: fn(),
    onDecline: fn(),
    onWeighBorrowed: fn(),
    onMarkDried: fn(),
  },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof OverviewView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Main board. */
export const Default: Story = {};

/** No groups: Borrows and Groups sections are left out. */
export const NoGroups: Story = {
  args: { groups: [], request: null, requestCount: 0, lends: [] },
};

/** Patterns board 04: Overview · new user. */
export const NewUser: Story = {
  args: {
    summary: stockSummary([]),
    value: stockValue([]),
    runningLow: [],
    drying: [],
    activity: [],
    groups: [],
    request: null,
    requestCount: 0,
    lends: [],
    dateLine: undefined,
  },
};

export const Mobile: Story = {
  globals: { viewport: { value: 'mobile' } },
};
