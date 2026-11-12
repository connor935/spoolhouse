import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { DEFAULT_INVENTORY_QUERY } from '@/lib/inventory-params';
import { inventory } from '@/stories/fixtures/inventory';
import { InventoryView } from './inventory-view';

const meta = {
  title: 'Pages/Inventory',
  component: InventoryView,
  args: {
    inventory,
    query: DEFAULT_INVENTORY_QUERY,
    properties: [
      { id: 'p-density', name: 'Density', unit: 'g/cm³', valueType: 'number' },
      {
        id: 'p-extruder',
        name: 'Extruder temp',
        unit: '°C',
        valueType: 'range',
      },
    ],
    propertiesByMaterialId: {},
    forecastDaysByMaterial: { 'mat-prusa-orange': 42 },
    requestedBy: { 'spool-po-2': 'Anna' },
    onQueryChange: fn(),
    onAddSpool: fn(),
    onSelectSpool: fn(),
    onEditSpool: fn(),
    onMarkDried: fn(),
    onOpenMaterial: fn(),
  },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof InventoryView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Inventory board. */
export const Default: Story = {};

export const Filtered: Story = {
  args: { query: { ...DEFAULT_INVENTORY_QUERY, filamentTypes: ['PETG'] } },
};

/** Patterns board 04: "No spools match these filters." */
export const NoMatches: Story = {
  args: { query: { ...DEFAULT_INVENTORY_QUERY, q: 'unobtainium' } },
};

export const EmptyStatus: Story = {
  args: {
    inventory: inventory.filter((m) => m.spools.every((s) => !s.isEmpty)),
    query: { ...DEFAULT_INVENTORY_QUERY, status: 'empty' },
  },
};

/** Patterns board 04: the onboarding empty state, before the first spool. */
export const NewUser: Story = { args: { inventory: [] } };

/** MobileInventory board. */
export const Mobile: Story = {
  args: { layout: 'mobile' },
  globals: { viewport: { value: 'mobile' } },
};
