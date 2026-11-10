import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { SearchIcon } from 'lucide-react';
import * as React from 'react';
import { fn } from 'storybook/test';
import { ActiveFilterChips } from '@/components/common/active-filter-chips';
import { Button } from '@/components/ui/button';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input';
import {
  countActiveFilters,
  EMPTY_FILTER_VALUE,
  filterChips,
  removeFilterChip,
} from '@/lib/filter-value';
import {
  catalogCounts,
  filterProperties,
  patternsFilterValue,
} from '@/stories/fixtures/catalog';
import { FilterPanel, FiltersButton } from './filter-panel';

const meta = {
  title: 'Design/FilterPanel',
  component: FilterPanel,
  args: {
    value: patternsFilterValue,
    onChange: fn(),
    showMinLeft: true,
    properties: filterProperties,
  },
  // Controlled component: the story keeps the value so edits show up.
  render: function Render(args) {
    const [value, setValue] = React.useState(args.value);
    return (
      <FilterPanel
        {...args}
        value={value}
        onChange={(next) => {
          setValue(next);
          args.onChange(next);
        }}
      />
    );
  },
  decorators: [
    (Story) => (
      <div className="max-w-[1040px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof FilterPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Patterns board, section 01: "Filters · 3". */
export const Inventory: Story = {};

export const GroupStock: Story = { args: { showHideLent: true } };

export const Catalog: Story = {
  args: {
    showMinLeft: false,
    value: { ...patternsFilterValue, minLeftGrams: null },
  },
};

/** Nothing set: Clear all is disabled. */
export const Empty: Story = { args: { value: EMPTY_FILTER_VALUE } };

/**
 * CatalogMaterials toolbar: search, Filters toggle with count, Clear, result
 * count; the panel expands underneath and the active chips follow it.
 */
export const UnderToolbar: Story = {
  args: Catalog.args,
  render: function Render(args) {
    const [value, setValue] = React.useState(args.value);
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState('pla');
    const change = (next: typeof value) => {
      setValue(next);
      args.onChange(next);
    };
    const count = countActiveFilters(value);
    return (
      <div className="flex flex-col gap-3">
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
            aria-controls="catalog-filters"
            onClick={() => setOpen((o) => !o)}
          />
          {(count > 0 || query !== '') && (
            <Button
              variant="ghost"
              onClick={() => {
                setQuery('');
                change(EMPTY_FILTER_VALUE);
              }}
            >
              Clear
            </Button>
          )}
          <span className="kicker ml-auto">
            <span className="text-foreground">
              {catalogCounts.matching.toLocaleString('en-US')}
            </span>{' '}
            of {catalogCounts.total.toLocaleString('en-US')}
          </span>
        </div>
        {open && (
          <FilterPanel
            id="catalog-filters"
            {...args}
            value={value}
            onChange={change}
          />
        )}
        <ActiveFilterChips
          chips={filterChips(value, args.properties ?? [])}
          onRemove={(id) => change(removeFilterChip(value, id))}
        />
      </div>
    );
  },
};
