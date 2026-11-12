import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { fn } from 'storybook/test';

import { ManufacturerNameFields } from './manufacturer-name-fields';

const meta = {
  title: 'Design/ManufacturerNameFields',
  component: ManufacturerNameFields,
  args: {
    idPrefix: 'story',
    manufacturer: '',
    onManufacturerChange: fn(),
    name: '',
    onNameChange: fn(),
    manufacturerPlaceholder: 'e.g. Prusament',
    namePlaceholder: 'e.g. Galaxy Black',
  },
  render: function Render(args) {
    const [manufacturer, setManufacturer] = useState(args.manufacturer);
    const [name, setName] = useState(args.name);
    return (
      <div className="w-96">
        <ManufacturerNameFields
          {...args}
          manufacturer={manufacturer}
          onManufacturerChange={(v) => {
            setManufacturer(v);
            args.onManufacturerChange(v);
          }}
          name={name}
          onNameChange={(v) => {
            setName(v);
            args.onNameChange(v);
          }}
        />
      </div>
    );
  },
} satisfies Meta<typeof ManufacturerNameFields>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Standalone request form / edit dialog. */
export const Stacked: Story = { args: { required: true } };

/** Inline "request new" mini-form in the spool editor. */
export const InlineGrid: Story = {
  args: {
    layout: 'grid',
    size: 'sm',
    nameLabel: 'Spool name',
    manufacturer: 'Polymaker',
    name: 'Cardboard 1 kg',
  },
};
