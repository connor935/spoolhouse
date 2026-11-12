import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { SearchIcon, SlidersHorizontalIcon } from 'lucide-react';
import * as React from 'react';
import { fn } from 'storybook/test';
import { ActiveFilterChips } from '@/components/common/active-filter-chips';
import { FilterPanel, FiltersButton } from '@/components/common/filter-panel';
import { FilterSheet } from '@/components/common/filter-sheet';
import { Swatch } from '@/components/inventory/swatch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  countActiveFilters,
  EMPTY_FILTER_VALUE,
  filterChips,
  removeFilterChip,
  type FilterValue,
} from '@/lib/filter-value';
import {
  adminMaterialRows,
  catalogCounts,
  filterProperties,
  materialGroups,
  spoolTypeGroups,
  type CatalogMaterialEntry,
  type CatalogSpoolTypeEntry,
} from '@/stories/fixtures/catalog';
import { StatusBadge } from '@/components/common/status-badge';
import { ManufacturerHeader } from '../manufacturer-header';
import {
  CatalogRow,
  CatalogRowActions,
  type CatalogRowEntry,
} from './catalog-row';

const [bambu, prusament, sunlu] = materialGroups;
const galaxyBlack = prusament.entries[0];
const galaxyPurple = prusament.entries[1];
const [galaxyBlue, silkRainbow] = sunlu.entries;
const [, polymaker, prusamentTypes] = spoolTypeGroups;

const materialEntry = (e: CatalogMaterialEntry): CatalogRowEntry => ({
  kind: 'material',
  material: e.material,
  stockCount: e.stockCount,
});
const spoolTypeEntry = (e: CatalogSpoolTypeEntry): CatalogRowEntry => ({
  kind: 'spool-type',
  spoolType: e.spoolType,
  inUseCount: e.inUseCount,
});

const meta = {
  title: 'Design/CatalogRow',
  component: CatalogRow,
  args: { entry: materialEntry(galaxyBlack) },
  decorators: [
    (Story) => (
      <div className="max-w-[880px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CatalogRow>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Material in the viewer's stock; the whole row opens the material. */
export const Material: Story = { args: { onOpen: fn() } };

export const MaterialAsLink: Story = {
  args: {
    entry: materialEntry(galaxyPurple),
    href: '#materials/cat-galaxy-purple',
  },
};

/** A light colour keeps its edge on the card. */
export const LightSwatch: Story = {
  args: { entry: materialEntry(bambu.entries[1]), onOpen: fn() },
};

export const PendingOwn: Story = {
  args: { entry: materialEntry(galaxyBlue), own: true, onOpen: fn() },
};

export const RejectedOwn: Story = {
  args: { entry: materialEntry(silkRainbow), own: true, onOpen: fn() },
};

/** Someone else's pending entry: status only, no "yours" hint. */
export const PendingOther: Story = {
  args: { entry: materialEntry(galaxyBlue), own: false },
};

/** CatalogMobile board: the hints move under the name. */
export const Compact: Story = {
  args: { compact: true, onOpen: fn() },
  decorators: [
    (Story) => (
      <div className="w-[358px] max-w-full">
        <Story />
      </div>
    ),
  ],
  globals: { viewport: { value: 'mobile' } },
};

export const CompactPending: Story = {
  ...Compact,
  args: { ...PendingOwn.args, compact: true },
};

export const SpoolType: Story = {
  args: { entry: spoolTypeEntry(prusamentTypes.entries[0]) },
};

export const SpoolTypePending: Story = {
  args: { entry: spoolTypeEntry(polymaker.entries[1]), own: true },
};

export const SpoolTypeRejected: Story = {
  args: { entry: spoolTypeEntry(prusamentTypes.entries[1]) },
};

const adminCallbacks = {
  onApprove: fn(),
  onReject: fn(),
  onEdit: fn(),
  onDelete: fn(),
};

/** Admin catalog: inline review controls replace the chevron. */
export const AdminPending: Story = {
  args: {
    entry: materialEntry(galaxyBlue),
    onOpen: fn(),
    actions: (
      <CatalogRowActions
        status="pending"
        name="Galaxy Blue"
        {...adminCallbacks}
      />
    ),
  },
};

export const AdminRejected: Story = {
  args: {
    entry: materialEntry(silkRainbow),
    actions: (
      <CatalogRowActions
        status="rejected"
        name="Silk Rainbow"
        {...adminCallbacks}
      />
    ),
  },
};

/** Approved and in use: shows its status, Delete is blocked. */
export const AdminApprovedInUse: Story = {
  args: {
    entry: { kind: 'material', material: adminMaterialRows[4].material },
    actions: (
      <CatalogRowActions
        status="approved"
        name="Galaxy Black"
        deleteBlockedReason="In use by 12 spools"
        {...adminCallbacks}
      />
    ),
  },
};

export const AdminSpoolType: Story = {
  args: {
    entry: spoolTypeEntry(polymaker.entries[1]),
    actions: (
      <CatalogRowActions
        status="pending"
        name="Cardboard 3 kg"
        {...adminCallbacks}
      />
    ),
  },
};

// --- Boards: the atoms composed the way the catalog pages (task 06b) will. ---

/** CatalogMaterials board: one active property range ("Filters 1"). */
const boardFilter: FilterValue = {
  ...EMPTY_FILTER_VALUE,
  propertyConstraints: [
    { id: 'prop-density', propertyId: 'prop-density', min: 1.2, max: 1.3 },
  ],
};

const fmt = (n: number) => n.toLocaleString('en-US');

function CatalogGroups({ compact = false }: { compact?: boolean }) {
  return (
    <div>
      {materialGroups.map((group) => (
        <section key={group.manufacturer} aria-label={group.manufacturer}>
          <ManufacturerHeader
            name={group.manufacturer}
            count={group.total}
            compact={compact}
          />
          {group.entries.map((e) => (
            <CatalogRow
              key={e.material.id}
              entry={materialEntry(e)}
              own={e.own}
              compact={compact}
              onOpen={fn()}
            />
          ))}
        </section>
      ))}
    </div>
  );
}

/** CatalogMaterials board, desktop: toolbar, filters panel, chips, groups. */
export const BoardCatalogMaterials: Story = {
  parameters: { layout: 'fullscreen' },
  decorators: [],
  render: function Render() {
    const [value, setValue] = React.useState(boardFilter);
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState('pla');
    const count = countActiveFilters(value);
    return (
      <div className="mx-auto flex max-w-[1040px] flex-col gap-5 p-8">
        <div className="flex flex-wrap items-center gap-2.5">
          <InputGroup variant="ink" className="w-auto flex-[1_1_320px]">
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              aria-label="Search materials"
              placeholder="Search manufacturer, material or color…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </InputGroup>
          <FiltersButton
            count={count}
            open={open}
            aria-controls="board-filters"
            onClick={() => setOpen((o) => !o)}
          />
          {(count > 0 || query !== '') && (
            <Button
              variant="ghost"
              onClick={() => {
                setQuery('');
                setValue(EMPTY_FILTER_VALUE);
              }}
            >
              Clear
            </Button>
          )}
          <span className="kicker ml-auto">
            <span className="text-foreground">
              {fmt(catalogCounts.matching)}
            </span>{' '}
            of {fmt(catalogCounts.total)}
          </span>
        </div>
        {open && (
          <FilterPanel
            id="board-filters"
            value={value}
            onChange={setValue}
            properties={filterProperties}
          />
        )}
        <ActiveFilterChips
          chips={filterChips(value, filterProperties)}
          onRemove={(id) => setValue(removeFilterChip(value, id))}
        />
        <CatalogGroups />
        <div className="flex items-center justify-between gap-3">
          <span className="kicker">
            Showing first {catalogCounts.pageSize} of{' '}
            {fmt(catalogCounts.matching)} — refine your search.
          </span>
          <Button variant="outline">Load more</Button>
        </div>
      </div>
    );
  },
};

/** CatalogMobile board: compact rows, filters in a bottom sheet. */
export const BoardCatalogMobile: Story = {
  parameters: { layout: 'fullscreen' },
  globals: { viewport: { value: 'mobile' } },
  decorators: [],
  render: function Render() {
    const [value, setValue] = React.useState(boardFilter);
    const [open, setOpen] = React.useState(false);
    const count = countActiveFilters(value);
    return (
      <div className="flex flex-col gap-3 p-4">
        <span className="kicker">
          <span className="text-accent-ink">06</span> — Materials ·{' '}
          {fmt(catalogCounts.matching)} of {fmt(catalogCounts.total)}
        </span>
        <div className="flex gap-2">
          <InputGroup variant="ink" className="h-11">
            <InputGroupInput aria-label="Search materials" defaultValue="pla" />
          </InputGroup>
          <Button
            variant="outline"
            className="relative size-11 p-0"
            aria-label={count > 0 ? `Filters, ${count} active` : 'Filters'}
            onClick={() => setOpen(true)}
          >
            <SlidersHorizontalIcon />
            {count > 0 && (
              <span
                aria-hidden
                className="bg-accent absolute top-2 right-2 size-2 rounded-full"
              />
            )}
          </Button>
        </div>
        <CatalogGroups compact />
        <FilterSheet
          open={open}
          onOpenChange={setOpen}
          value={value}
          onChange={setValue}
          properties={filterProperties}
          resultCount={catalogCounts.matching}
          resultNoun={['material', 'materials']}
        />
      </div>
    );
  },
};

/** AdminMaterials board: status filter and the review table, pending first. */
export const BoardAdminTable: Story = {
  parameters: { layout: 'fullscreen' },
  decorators: [],
  render: function Render() {
    const [status, setStatus] = React.useState(['all']);
    const pending = adminMaterialRows.filter(
      (r) => r.material.status === 'pending'
    );
    const rejected = adminMaterialRows.filter(
      (r) => r.material.status === 'rejected'
    );
    const rows = adminMaterialRows.filter(
      (r) => status[0] === 'all' || r.material.status === status[0]
    );
    return (
      <div className="mx-auto flex max-w-[1040px] flex-col gap-5 p-8">
        <ToggleGroup
          aria-label="Filter by status"
          value={status}
          onValueChange={setStatus}
        >
          <ToggleGroupItem value="all">All</ToggleGroupItem>
          <ToggleGroupItem value="approved">Approved</ToggleGroupItem>
          <ToggleGroupItem value="pending" count={pending.length}>
            Pending
          </ToggleGroupItem>
          <ToggleGroupItem value="rejected" count={rejected.length}>
            Rejected
          </ToggleGroupItem>
        </ToggleGroup>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Material</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(
              ({ material: m, submittedBy, submittedAgo, spoolCount }) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <span className="flex items-center gap-2.5">
                      <Swatch color={m.color} decorative />
                      <span>
                        <span className="text-muted-foreground">
                          {m.manufacturer} ·
                        </span>{' '}
                        <span className="font-medium">{m.name}</span>
                      </span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge>{m.filamentType}</Badge>
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      status={m.status as 'approved' | 'pending' | 'rejected'}
                    />
                  </TableCell>
                  <TableCell>
                    <span className="flex flex-col gap-0.5">
                      <span>{submittedBy ?? 'Imported'}</span>
                      <span className="kicker">{submittedAgo}</span>
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <CatalogRowActions
                      status={m.status}
                      name={m.name}
                      {...adminCallbacks}
                      deleteBlockedReason={
                        spoolCount > 0
                          ? `In use by ${spoolCount} ${spoolCount === 1 ? 'spool' : 'spools'}`
                          : undefined
                      }
                    />
                  </TableCell>
                </TableRow>
              )
            )}
          </TableBody>
        </Table>
      </div>
    );
  },
};
