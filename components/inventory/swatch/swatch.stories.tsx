import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Swatch } from './swatch';

const meta = {
  title: 'Design/Swatch',
  component: Swatch,
  args: { color: '#22242A', label: 'Galaxy Black' },
} satisfies Meta<typeof Swatch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Sizes: Story = {
  render: (args) => (
    <div className="flex items-center gap-3">
      <Swatch {...args} size="sm" />
      <Swatch {...args} size="md" />
      <Swatch {...args} size="lg" />
      <Swatch {...args} size="xl" />
    </div>
  ),
};

/** Light colours keep an edge thanks to the ring and inset shadow. */
export const Light: Story = {
  args: { color: '#F2F2EE', label: 'Signal White', size: 'xl' },
};

/** Materials without a colour fall back to DEFAULT_MATERIAL_COLOR. */
export const NoColor: Story = {
  args: { color: null, label: undefined, size: 'xl' },
};

export const Decorative: Story = { args: { decorative: true, size: 'lg' } };
