import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { fn } from 'storybook/test';
import { ALL_TYPES } from '@/lib/catalog-filter-items';
import { ImportView } from './import-view';

const mfr = (
  slug: string,
  manufacturerName: string | null,
  importedCount = 0,
  lastError: string | null = null
) => ({ slug, manufacturerName, importedCount, lastError });

const manufacturers = [
  mfr('bambulab', 'Bambu Lab', 214),
  mfr('esun', 'eSun', 188),
  mfr('extrudr', null),
  mfr('fiberlogy', 'Fiberlogy', 0, 'SpoolmanDB returned 502 Bad Gateway'),
  mfr('polymaker', 'Polymaker', 312),
  mfr('prusament', 'Prusament', 96),
  mfr('sunlu', null),
];

const queue = ['esun', 'prusament', 'sunlu'];

const meta = {
  title: 'Pages/AdminImport',
  component: ImportView,
  parameters: { layout: 'padded' },
  args: {
    manufacturers,
    query: '',
    onQueryChange: fn(),
    filamentType: ALL_TYPES,
    onFilamentTypeChange: fn(),
    selected: new Set(queue),
    onSelectedChange: fn(),
    run: null,
    onImport: fn(),
    onRetry: fn(),
  },
} satisfies Meta<typeof ImportView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Selection and search live in state, like the container. */
export const Interactive: Story = {
  args: { selected: new Set() },
  render: function Render(args) {
    const [query, setQuery] = useState(args.query);
    const [selected, setSelected] = useState(args.selected);
    return (
      <ImportView
        {...args}
        query={query}
        onQueryChange={setQuery}
        selected={selected}
        onSelectedChange={(next) => {
          setSelected(next);
          args.onSelectedChange(next);
        }}
      />
    );
  },
};

export const Running: Story = {
  args: { run: { status: 'running', queue, index: 1 } },
};

export const Failed: Story = {
  args: {
    run: {
      status: 'failed',
      queue,
      index: 1,
      message: 'SpoolmanDB returned 502 Bad Gateway.',
    },
  },
};

export const Done: Story = {
  args: { run: { status: 'done', queue }, selected: new Set() },
};

export const NoMatch: Story = { args: { query: 'zzz' } };

export const Mobile: Story = {
  args: Failed.args,
  globals: { viewport: { value: 'mobile' } },
};
