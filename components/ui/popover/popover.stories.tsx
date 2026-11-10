import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { Button } from '../button';
import { Input } from '../input';
import { Label } from '../label';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from './popover';

type Args = { onSave: () => void; defaultOpen?: boolean };

const meta = {
  title: 'UI/Popover',
  args: { onSave: fn() },
  parameters: { layout: 'centered' },
  render: ({ defaultOpen }) => (
    <Popover defaultOpen={defaultOpen}>
      <PopoverTrigger render={<Button variant="outline" />}>
        Show details
      </PopoverTrigger>
      <PopoverContent>
        <PopoverHeader>
          <PopoverTitle>Drying</PopoverTitle>
          <PopoverDescription>
            PETG absorbs moisture. Dry at 65 °C for 4 h.
          </PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  ),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};

export const Open: Story = { args: { defaultOpen: true } };

/** Reweigh.dc.html desktop popover, anchored to a spool tile. Shell only:
 * the live readout comes with ReweighPopover (task 04b). */
export const ReweighPopover: Story = {
  args: { defaultOpen: true },
  render: ({ onSave, defaultOpen }) => (
    <Popover defaultOpen={defaultOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="border-ink bg-card flex w-40 flex-col gap-2 rounded-[6px] border p-3 text-left"
          />
        }
      >
        <span className="text-muted-foreground font-mono text-xs">#03</span>
        <span className="display-weight">1,000 g</span>
      </PopoverTrigger>
      <PopoverContent align="start">
        <PopoverHeader>
          <PopoverTitle>Re-weigh #03 Galaxy Black</PopoverTitle>
        </PopoverHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reweigh-total">Measured total weight (g)</Label>
          <Input id="reweigh-total" inputMode="numeric" defaultValue="1112" />
          <p className="text-muted-foreground text-xs">
            Last: 1,193 g total · 2 weeks ago
          </p>
        </div>
        <div className="border-border text-muted-foreground flex h-16 items-center justify-center rounded-[4px] border border-dashed text-xs">
          Filament-left readout
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="kicker">Edit all details</span>
          <Button size="sm" onClick={onSave}>
            Save
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  ),
};
