import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { CheckIcon, PencilIcon, Trash2Icon } from 'lucide-react';
import { fn } from 'storybook/test';

import { StatusBadge } from '@/components/common/status-badge';
import { Button } from '@/components/ui/button';
import { KeyValueRow } from './key-value-row';

function Actions({ name, verify = false }: { name: string; verify?: boolean }) {
  return (
    <>
      {verify && (
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Verify ${name}`}
          className="text-accent"
          onClick={fn()}
        >
          <CheckIcon />
        </Button>
      )}
      <Button variant="ghost" size="icon" aria-label={`Edit ${name}`} onClick={fn()}>
        <PencilIcon />
      </Button>
      <Button variant="ghost" size="icon" aria-label={`Delete ${name}`} onClick={fn()}>
        <Trash2Icon />
      </Button>
    </>
  );
}

function Measure({ value, unit }: { value: string; unit: string }) {
  return (
    <span className="font-mono">
      {value} <span className="text-muted-foreground">{unit}</span>
    </span>
  );
}

const meta = {
  title: 'Design/KeyValueRow',
  component: KeyValueRow,
  args: {
    label: 'Density',
    children: <Measure value="1.24" unit="g/cm³" />,
    action: <Actions name="Density" />,
  },
  decorators: [
    (Story) => (
      <div className="max-w-[720px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof KeyValueRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** MaterialDetail properties: stacked rows, unverified value with Verify. */
export const List: Story = {
  render: () => (
    <div>
      <KeyValueRow label="Density" action={<Actions name="Density" />}>
        <Measure value="1.24" unit="g/cm³" />
      </KeyValueRow>
      <KeyValueRow label="Diameter" action={<Actions name="Diameter" />}>
        <Measure value="1.75, 2.85" unit="mm" />
      </KeyValueRow>
      <KeyValueRow label="Extruder temp" action={<Actions name="Extruder temp" />}>
        <Measure value="210–230" unit="°C" />
      </KeyValueRow>
      <KeyValueRow
        label={
          <>
            Drying temp
            <StatusBadge status="unverified" title="Added by Anna Weber — not yet verified" />
          </>
        }
        action={<Actions name="Drying temp" verify />}
      >
        <Measure value="55" unit="°C" />
      </KeyValueRow>
    </div>
  ),
};

export const Mobile: Story = {
  ...List,
  globals: { viewport: { value: 'mobile', isRotated: false } },
};
