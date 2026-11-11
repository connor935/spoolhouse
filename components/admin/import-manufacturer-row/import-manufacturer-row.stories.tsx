import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import * as React from 'react';
import { fn } from 'storybook/test';
import { upstreamManufacturers } from '@/stories/fixtures/catalog';
import {
  ImportManufacturerRow,
  ImportSelectAllRow,
} from './import-manufacturer-row';

const bySlug = (slug: string) =>
  upstreamManufacturers.find((m) => m.slug === slug)!;

const meta = {
  title: 'Design/ImportManufacturerRow',
  component: ImportManufacturerRow,
  args: {
    manufacturer: bySlug('bambulab'),
    checked: false,
    onCheckedChange: fn(),
  },
  decorators: [
    (Story) => (
      <div className="max-w-[880px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ImportManufacturerRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Imported: Story = {};

/** Never imported: no display name yet, so only the slug. */
export const NeverImported: Story = {
  args: { manufacturer: bySlug('extrudr') },
};

export const LastRunFailed: Story = {
  args: { manufacturer: bySlug('fiberlogy') },
};

export const Checked: Story = { args: { checked: true } };

/** Locked while an import runs. */
export const Disabled: Story = { args: { checked: true, disabled: true } };

/** AdminImport board: select-all header, rows, and the overflow line. */
export const List: Story = {
  render: function Render(args) {
    const [selected, setSelected] = React.useState(
      () => new Set(['esun', 'prusament', 'sunlu'])
    );
    const all = upstreamManufacturers.every((m) => selected.has(m.slug));
    const toggle = (slug: string, on: boolean) => {
      const next = new Set(selected);
      if (on) next.add(slug);
      else next.delete(slug);
      setSelected(next);
      args.onCheckedChange(on);
    };
    return (
      <div className="border-ink border-t-2">
        <ImportSelectAllRow
          checked={all}
          indeterminate={!all && selected.size > 0}
          onCheckedChange={(on) =>
            setSelected(
              new Set(on ? upstreamManufacturers.map((m) => m.slug) : [])
            )
          }
        />
        {upstreamManufacturers.map((m) => (
          <ImportManufacturerRow
            key={m.slug}
            manufacturer={m}
            checked={selected.has(m.slug)}
            onCheckedChange={(on) => toggle(m.slug, on)}
          />
        ))}
        <p className="kicker border-border border-t py-3">
          + 453 more manufacturers
        </p>
      </div>
    );
  },
};
