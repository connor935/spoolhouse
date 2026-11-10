import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { Button } from '@/components/ui/button';
import { Alert, Note } from './alert';

const meta = {
  title: 'Design/Alert',
  component: Alert,
  args: {
    children: (
      <>
        <strong>
          Import stopped at <span className="font-mono">prusament</span>.
        </strong>{' '}
        SpoolmanDB returned 502 Bad Gateway.{' '}
        <span className="text-muted-foreground">
          esun was imported; sunlu was skipped.
        </span>
      </>
    ),
  },
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** AdminImport error state with a retry action at the right end. */
export const WithAction: Story = {
  args: {
    action: (
      <Button variant="outline" size="sm" onClick={fn()}>
        Retry
      </Button>
    ),
  },
};

export const WithoutIcon: Story = {
  args: { icon: null, children: 'Measured weight is below the empty spool.' },
};

/** Accent notice: `Note`, announced politely (role="status"). */
export const NoteBox: Story = {
  name: 'Note',
  render: () => <Note>Imported 3 manufacturers: esun, prusament, sunlu.</Note>,
};

export const Both: Story = {
  render: (args) => (
    <div className="flex max-w-[720px] flex-col gap-3">
      <Alert {...args} />
      <Note>Imported 3 manufacturers: esun, prusament, sunlu.</Note>
    </div>
  ),
};
