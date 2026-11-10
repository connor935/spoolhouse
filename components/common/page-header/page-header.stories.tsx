import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { PlusIcon } from 'lucide-react';
import Link from 'next/link';
import { fn } from 'storybook/test';

import { ReadoutStrip, Readout, readoutParts } from '@/components/common/readout-strip';
import { SectionHeader } from '@/components/common/section-header';
import { StatusBadge } from '@/components/common/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { formatMoney, formatWeight } from '@/lib/filament';
import { PageHeader } from './page-header';

const addSpool = fn();

const meta = {
  title: 'Design/PageHeader',
  component: PageHeader,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="px-10 pt-7 pb-14 max-sm:px-4">
        <Story />
      </div>
    ),
  ],
  args: {
    index: '01',
    kicker: 'Overview',
    meta: 'Mon 09 Nov 2026 · last weighing 14:02',
    title: 'Overview',
    actions: (
      <Button variant="accent" onClick={addSpool}>
        <PlusIcon />
        Add spool
        <Kbd aria-hidden>N</Kbd>
      </Button>
    ),
  },
} satisfies Meta<typeof PageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Kicker with section number, meta on the right, primary action. */
export const Default: Story = {};

/** MaterialDetail: breadcrumb kicker, swatch, type tag, status line. */
export const WithBreadcrumb: Story = {
  args: {
    index: '02',
    kicker: undefined,
    breadcrumb: [{ label: 'Inventory', href: '/inventory' }, { label: 'Galaxy Black' }],
    meta: undefined,
    title: 'Galaxy Black',
    leading: (
      <span
        aria-hidden="true"
        className="size-16 shrink-0 rounded-full border-2 border-swatch-ring shadow-swatch max-sm:size-11"
        style={{ background: '#1F1F1F' }}
      />
    ),
    badges: (
      <Badge className="h-6 px-2 text-[13px]">PLA</Badge>
    ),
    description: (
      <span className="flex flex-wrap items-center gap-2.5">
        <span className="kicker text-foreground">Prusament</span>
        <span className="kicker">·</span>
        <span className="kicker">#1F1F1F</span>
        <span className="kicker">·</span>
        <StatusBadge status="pending" />
        <StatusBadge status="imported" />
      </span>
    ),
    actions: (
      <>
        <Button variant="outline">Edit</Button>
        <Button variant="accent">
          <PlusIcon />
          Add spool
        </Button>
      </>
    ),
  },
};

/** AdminImport: kicker trail as text, source on the right, description. */
export const WithDescription: Story = {
  args: {
    index: 'A4',
    kicker: 'Admin / Import catalog',
    meta: 'Source · SpoolmanDB',
    title: 'Import catalog',
    description:
      'Pull manufacturers, materials and spool types from SpoolmanDB into the global catalog. Re-importing updates existing entries.',
    actions: undefined,
  },
};

/** Title scales down to 46px below the `sm` breakpoint (MobileInventory). */
export const Mobile: Story = {
  args: {
    index: '02',
    kicker: '14 spools · 8.09 kg',
    meta: undefined,
    title: 'Inventory',
    actions: undefined,
  },
  globals: { viewport: { value: 'mobile', isRotated: false } },
};

const weight = readoutParts(formatWeight(8090));
const used = readoutParts(formatWeight(1180));
const value = readoutParts(formatMoney(21460));

/**
 * The top of the Main (Overview) board: header without its own rule over a
 * ruled readout strip, then two numbered sections.
 */
export const PageSkeleton: Story = {
  args: { rule: false },
  render: (args) => (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-8">
      <div className="flex flex-col gap-8">
        <PageHeader {...args} />
        <ReadoutStrip ruled>
          <Readout
            href="/inventory"
            size="big"
            label="Spools in stock"
            value="14"
            unit="/ 19"
            sub={
              <span className="kicker flex items-center gap-1.5 tracking-[0.04em]">
                <Badge variant="destructive">2 low</Badge>5 empty
              </span>
            }
          />
          <Readout
            href="/inventory"
            size="big"
            label="Filament left"
            {...weight}
            sub="8 materials · 3 types"
          />
          <Readout
            href="/stats"
            size="big"
            label="Used · 30 days"
            {...used}
            sub="−12 % vs. prev. 30 days"
          />
          <Readout
            href="/stats"
            size="big"
            label="Stock value"
            {...value}
            sub="11/14 priced"
          />
        </ReadoutStrip>
      </div>
      <div className="flex flex-wrap gap-x-10 gap-y-10">
        <section aria-labelledby="sec-low" className="min-w-0 flex-[2_1_560px]">
          <SectionHeader
            id="sec-low"
            index="02"
            title="Running low"
            aside={<Link href="/inventory">Inventory →</Link>}
          />
          <div className="h-40 rounded-[4px] border border-dashed border-border" />
        </section>
        <section aria-labelledby="sec-usage" className="min-w-0 flex-[1_1_320px]">
          <SectionHeader
            id="sec-usage"
            index="03"
            title="Monthly usage"
            aside={<span className="kicker">Last 12 months</span>}
          />
          <div className="h-40 rounded-[4px] border border-dashed border-border" />
        </section>
      </div>
    </div>
  ),
};
