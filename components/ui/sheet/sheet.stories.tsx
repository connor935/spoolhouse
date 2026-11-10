import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { Button } from '../button';
import { Input } from '../input';
import { Label } from '../label';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './sheet';

type Args = { onSave: () => void; defaultOpen?: boolean };

const meta = {
  title: 'UI/Sheet',
  args: { onSave: fn() },
  globals: { viewport: { value: 'mobile' } },
  // Bottom sheet (Reweigh.dc.html, mobile, borrowed spool).
  render: ({ onSave, defaultOpen }) => (
    <Sheet defaultOpen={defaultOpen}>
      <SheetTrigger render={<Button variant="outline" />}>
        Re-weigh
      </SheetTrigger>
      <SheetContent side="bottom">
        <SheetHeader kicker="Borrowed from Mia Koch">
          <SheetTitle>Re-weigh #04 Basic Cyan</SheetTitle>
          <SheetDescription>Put the whole spool on a scale.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sheet-total">Measured total weight (g)</Label>
          <Input id="sheet-total" inputMode="numeric" defaultValue="480" />
        </div>
        <SheetFooter>
          <SheetClose render={<Button size="lg" />} onClick={onSave}>
            Save
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Bottom: Story = {};

export const BottomOpen: Story = { args: { defaultOpen: true } };

/** Side drawer for the mobile navigation (MobileDrawer.dc.html). */
export const LeftDrawer: Story = {
  render: ({ defaultOpen }) => (
    <Sheet defaultOpen={defaultOpen}>
      <SheetTrigger render={<Button variant="outline" />}>Menu</SheetTrigger>
      <SheetContent side="left">
        <SheetHeader className="h-11 justify-center">
          <SheetTitle className="text-xl">Spoolhouse</SheetTitle>
        </SheetHeader>
        <nav aria-label="Navigation" className="flex flex-col">
          {['Overview', 'Inventory', 'Borrows', 'Groups', 'Statistics'].map(
            (item) => (
              <a
                key={item}
                href="#"
                className="hover:bg-muted rounded-[6px] px-3 py-2.5 text-sm"
              >
                {item}
              </a>
            )
          )}
        </nav>
      </SheetContent>
    </Sheet>
  ),
};

export const LeftDrawerOpen: Story = {
  ...LeftDrawer,
  args: { defaultOpen: true },
};

export const BottomOpenDesktop: Story = {
  args: { defaultOpen: true },
  globals: { viewport: { value: 'desktop' } },
};
