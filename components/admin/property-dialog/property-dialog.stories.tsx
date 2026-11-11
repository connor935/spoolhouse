import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { PropertyDialog } from './property-dialog';

const extruderTemp = {
  id: 'p-extruder',
  key: 'extruder_temp',
  name: 'Extruder temp',
  unit: '°C',
  description: 'Nozzle temperature range recommended by the manufacturer.',
  valueType: 'range',
  valueCount: 412,
};

const meta = {
  title: 'Design/PropertyDialog',
  component: PropertyDialog,
  args: {
    open: true,
    onOpenChange: fn(),
    onSubmit: fn(),
  },
} satisfies Meta<typeof PropertyDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Create: Story = {};

export const Edit: Story = { args: { property: extruderTemp } };

/** The server refused the type change: its message replaces the notice. */
export const Refused: Story = {
  args: {
    property: { ...extruderTemp, valueType: 'list' },
    error:
      '3 existing values do not fit "list" (e.g. "200–220", "210–230", "195–215"). Fix them first, or choose another type.',
  },
};

export const Saving: Story = {
  args: { property: extruderTemp, pending: true },
};
