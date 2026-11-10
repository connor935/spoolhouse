import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import * as React from 'react';
import { fn } from 'storybook/test';
import type { SpoolView } from '@/lib/filament';
import {
  basicCyanPla,
  daysAgo,
  FIXTURE_NOW,
  fireEngineRedPetg,
  galaxyBlackPla,
  prusaOrangePetg,
} from '@/stories/fixtures/inventory';
import { ReweighPopover } from '../reweigh-popover';
import { spoolNumber } from '../spool-tile';
import { MaterialBlock } from './material-block';

const meta = {
  title: 'Design/MaterialBlock',
  component: MaterialBlock,
  args: {
    inventory: galaxyBlackPla,
    forecastDays: 42,
    onOpenMaterial: fn(),
    onSelectSpool: fn(),
    onMarkDried: fn(),
    onEditSpool: fn(),
    onAddSpool: fn(),
  },
} satisfies Meta<typeof MaterialBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Shelf: Story = {};

export const LowSpool: Story = {
  args: { inventory: prusaOrangePetg, forecastDays: 9 },
};

export const NeedsDrying: Story = {
  args: { inventory: fireEngineRedPetg, forecastDays: null },
};

/** "In stock" filter: the empty spool is hidden, numbers stay put. */
export const HideEmpty: Story = {
  args: {
    inventory: basicCyanPla,
    forecastDays: null,
    filter: (s: SpoolView) => !s.isEmpty,
  },
};

export const WithRequest: Story = {
  args: { requestedBy: { 'spool-gb-3': 'Anna' } },
};

/** MobileInventory board: collapsible card with compact rows. */
export const Card: Story = {
  args: { layout: 'card' },
  decorators: [
    (Story) => (
      <div className="w-[358px] max-w-full">
        <Story />
      </div>
    ),
  ],
  globals: { viewport: { value: 'mobile' } },
};

export const CardCollapsed: Story = {
  ...Card,
  args: { layout: 'card', defaultOpen: false },
};

/**
 * One row of Inventory.dc.html plus the Reweigh popover: click a tile to
 * re-weigh it, the way the inventory page will wire it (task 06a).
 */
export const InventoryRow: Story = {
  render: function Render(args) {
    const tiles = React.useRef(new Map<string, HTMLDivElement>());
    const [selected, setSelected] = React.useState<SpoolView | null>(null);
    const number = selected ? galaxyBlackPla.spools.indexOf(selected) + 1 : 0;
    return (
      <div className="max-w-[1280px] pb-[360px]">
        <div className="border-ink border-t-2">
          {[basicCyanPla, fireEngineRedPetg, galaxyBlackPla].map((inv) => (
            <MaterialBlock
              key={inv.material.id}
              {...args}
              inventory={inv}
              forecastDays={inv === galaxyBlackPla ? 42 : null}
              selectedSpoolId={selected?.id}
              tileRef={(id, el) => {
                if (el) tiles.current.set(id, el);
                else tiles.current.delete(id);
              }}
              onSelectSpool={(spool) => {
                args.onSelectSpool?.(spool);
                // The popover demo only re-weighs Galaxy Black.
                if (inv === galaxyBlackPla) setSelected(spool);
              }}
            />
          ))}
        </div>
        {selected && (
          <ReweighPopover
            open
            onOpenChange={(open) => !open && setSelected(null)}
            anchor={tiles.current.get(selected.id) ?? null}
            title={`Re-weigh ${spoolNumber(number)} Galaxy Black`}
            spool={selected}
            lastWeighedAt={daysAgo(14)}
            now={FIXTURE_NOW}
            onSave={() => setSelected(null)}
            onEditDetails={() => setSelected(null)}
          />
        )}
      </div>
    );
  },
};
