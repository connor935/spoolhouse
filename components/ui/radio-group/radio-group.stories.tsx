import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { RadioGroup, RadioGroupCard, RadioGroupItem } from './radio-group';

const meta = {
  title: 'UI/RadioGroup',
  component: RadioGroup,
  args: {
    'aria-label': 'Share mode',
    defaultValue: 'whitelist',
    onValueChange: fn(),
  },
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

/** GroupSettings share-mode cards (`.radio`). */
export const Cards: Story = {
  render: (args) => (
    <RadioGroup {...args}>
      <RadioGroupCard
        value="all"
        title="Share all materials"
        description="Every spool you own is visible to this group."
      />
      <RadioGroupCard
        value="whitelist"
        title="Share only selected materials"
        description="Pick the materials members may see and request."
      />
      <RadioGroupCard
        value="blacklist"
        title="Share all except selected materials"
        description="Hide a few materials, share the rest."
      />
    </RadioGroup>
  ),
};

export const CardsDisabled: Story = {
  ...Cards,
  args: { disabled: true },
};

export const Plain: Story = {
  args: { 'aria-label': 'Chart', defaultValue: 'grams' },
  render: (args) => (
    <RadioGroup {...args} className="flex gap-5">
      {[
        { value: 'grams', label: 'Grams' },
        { value: 'cost', label: 'Cost' },
      ].map(({ value, label }) => (
        <label
          key={value}
          className="inline-flex cursor-pointer items-center gap-2 text-sm"
        >
          <RadioGroupItem value={value} />
          {label}
        </label>
      ))}
    </RadioGroup>
  ),
};
