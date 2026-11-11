import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { SpoolDetailsFields } from './spool-details-fields';

const meta = {
  title: 'Design/SpoolDetailsFields',
  component: SpoolDetailsFields,
  args: {
    value: {
      price: '',
      purchasedAt: '2026-11-10',
      location: '',
      lastDried: '',
    },
    locations: ['A1', 'A2', 'B1', 'AMS 2', 'Dry box 2'],
    heading: true,
    onChange: fn(),
  },
  decorators: [
    (Story) => (
      <div className="bg-card w-[512px] max-w-full p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SpoolDetailsFields>;

export default meta;
type Story = StoryObj<typeof meta>;

/** SpoolAdd board: "D Details · optional", location suggestions. */
export const Add: Story = {};

/** SpoolEdit board: filled in, with the NFC tag line. */
export const Edit: Story = {
  args: {
    heading: false,
    value: {
      price: '19.99',
      purchasedAt: '2026-03-14',
      location: 'A2',
      lastDried: '2026-08-02',
    },
    tagUid: '04:A2:3F:9B:61:80',
  },
};

export const NoLocations: Story = { args: { locations: [] } };
