import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { PropertiesView } from './properties-view';

const def = (
  key: string,
  name: string,
  unit: string | null,
  valueType: string,
  valueCount: number
) => ({
  id: `p-${key}`,
  key,
  name,
  unit,
  description: null,
  valueType,
  valueCount,
});

const meta = {
  title: 'Pages/AdminProperties',
  component: PropertiesView,
  parameters: { layout: 'padded' },
  args: {
    properties: [
      def('density', 'Density', 'g/cm³', 'number', 1812),
      def('diameter', 'Diameter', 'mm', 'list', 1640),
      def('extruder_temp', 'Extruder temp', '°C', 'range', 412),
      def('bed_temp', 'Bed temp', '°C', 'range', 398),
      def('drying_temp', 'Drying temp', '°C', 'integer', 96),
      def('tensile_strength', 'Tensile strength', 'MPa', 'number', 41),
      def('hardness', 'Hardness', 'Shore D', 'integer', 5),
      def('finish', 'Finish', null, 'text', 0),
    ],
    onCreate: fn(),
    onEdit: fn(),
    onDelete: fn(),
  },
} satisfies Meta<typeof PropertiesView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { args: { properties: [] } };

export const Mobile: Story = {
  globals: { viewport: { value: 'mobile' } },
};
