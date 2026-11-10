import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ComponentProps } from 'react';
import { fn } from 'storybook/test';
import { Input, InputGroup, InputGroupAddon, InputGroupInput } from '../input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../select';
import { Field, FieldDescription, FieldError, FieldLabel } from './field';

// The `.linkbtn` from the boards ("+ Request new"); the real one comes with
// the Button restyle.
function RequestNew({ onClick }: { onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-accent text-xs font-medium hover:underline"
    >
      + Request new
    </button>
  );
}

type FieldStoryArgs = ComponentProps<typeof Field> & {
  onRequestNew: () => void;
};

const meta = {
  title: 'UI/Field',
  component: Field,
  args: { onRequestNew: fn() },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<FieldStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Field {...args}>
      <FieldLabel>Location</FieldLabel>
      <Input placeholder="e.g. Dry box 2" />
      <FieldDescription>Shelf, box or AMS slot.</FieldDescription>
    </Field>
  ),
};

export const WithUnit: Story = {
  render: (args) => (
    <Field {...args}>
      <FieldLabel>Full filament weight (g)</FieldLabel>
      <InputGroup>
        <InputGroupInput numeric inputMode="numeric" defaultValue={1000} />
        <InputGroupAddon>g</InputGroupAddon>
      </InputGroup>
      <FieldDescription>Filament on a new spool, e.g. 1000 g.</FieldDescription>
    </Field>
  ),
};

export const RequiredWithAction: Story = {
  render: ({ onRequestNew, ...args }) => (
    <Field {...args}>
      <FieldLabel required action={<RequestNew onClick={onRequestNew} />}>
        Spool type
      </FieldLabel>
      <Input required placeholder="Search spool type or manufacturer…" />
      <FieldDescription>Empty spool weight: —</FieldDescription>
    </Field>
  ),
};

export const Invalid: Story = {
  render: (args) => (
    <Field {...args} invalid>
      <FieldLabel>Measured total weight (g)</FieldLabel>
      <InputGroup>
        <InputGroupInput numeric defaultValue="-4" />
        <InputGroupAddon>g</InputGroupAddon>
      </InputGroup>
      <FieldDescription>Weigh the whole spool on your scale.</FieldDescription>
      <FieldError>Enter a weight of 0 g or more.</FieldError>
    </Field>
  ),
};

export const Disabled: Story = {
  render: (args) => (
    <Field {...args} disabled>
      <FieldLabel>Email</FieldLabel>
      <Input variant="ink" defaultValue="anna@example.com" />
      <FieldDescription>Only admins can change emails.</FieldDescription>
    </Field>
  ),
};

const materials = [
  { value: 'galaxy-black-pla', label: 'Prusament · Galaxy Black · PLA' },
  { value: 'galaxy-black-petg', label: 'Prusament · Galaxy Black · PETG' },
  { value: 'galaxy-purple-pla', label: 'Prusament · Galaxy Purple · PLA' },
];

const spoolTypes = [
  { value: 'prusament-cardboard', label: 'Prusament · Cardboard 1 kg (193 g)' },
  { value: 'sunlu-plastic', label: 'Sunlu · Plastic 1 kg (135 g)' },
];

/** The add-spool form (SpoolAdd board) built only from form primitives. */
export const FormExample: Story = {
  decorators: [
    (Story) => (
      <div className="w-[560px] max-w-full">
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'padded' },
  render: ({ onRequestNew }) => (
    <form className="flex flex-col gap-5" onSubmit={(e) => e.preventDefault()}>
      <Field>
        <FieldLabel required action={<RequestNew onClick={onRequestNew} />}>
          Material
        </FieldLabel>
        <Select items={materials} defaultValue="galaxy-black-pla">
          <SelectTrigger variant="ink" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {materials.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field invalid>
        <FieldLabel required action={<RequestNew onClick={onRequestNew} />}>
          Spool type
        </FieldLabel>
        <Select items={spoolTypes}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Search spool type or manufacturer…" />
          </SelectTrigger>
          <SelectContent>
            {spoolTypes.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldDescription>Empty spool weight: —</FieldDescription>
        <FieldError>Pick a spool type (or request a new one).</FieldError>
      </Field>

      <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-2">
        <Field>
          <FieldLabel>Full filament weight (g)</FieldLabel>
          <InputGroup>
            <InputGroupInput numeric inputMode="numeric" defaultValue={1000} />
            <InputGroupAddon>g</InputGroupAddon>
          </InputGroup>
          <FieldDescription>
            Filament on a new spool, e.g. 1000 g.
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel>Measured total weight (g)</FieldLabel>
          <InputGroup>
            <InputGroupInput numeric inputMode="numeric" defaultValue={1193} />
            <InputGroupAddon>g</InputGroupAddon>
          </InputGroup>
          <FieldDescription>
            Prefilled for a fresh spool (filament + empty spool) — adjust to
            your scale value.
          </FieldDescription>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-2">
        <Field>
          <FieldLabel>Price paid (€)</FieldLabel>
          <InputGroup>
            <InputGroupInput
              numeric
              inputMode="decimal"
              placeholder="optional"
            />
            <InputGroupAddon>€</InputGroupAddon>
          </InputGroup>
        </Field>
        <Field>
          <FieldLabel>Purchased</FieldLabel>
          <Input type="date" defaultValue="2026-11-10" className="font-mono" />
        </Field>
        <Field>
          <FieldLabel>Location</FieldLabel>
          <Input placeholder="e.g. Dry box 2" />
        </Field>
        <Field>
          <FieldLabel>Last dried</FieldLabel>
          <Input type="date" className="font-mono" />
        </Field>
      </div>
    </form>
  ),
};
