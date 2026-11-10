import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import {
  BarChart3Icon,
  CircleUserIcon,
  LogOutIcon,
  MonitorIcon,
  MoonIcon,
  PencilIcon,
  ScaleIcon,
  SettingsIcon,
  SunIcon,
  Trash2Icon,
} from 'lucide-react';
import { fn } from 'storybook/test';
import { Button } from '../button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from './dropdown-menu';

const meta = {
  title: 'UI/DropdownMenu',
  component: DropdownMenu,
  args: { onOpenChange: fn() },
  decorators: [
    (Story) => (
      <div className="flex min-h-80 items-start justify-center pt-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DropdownMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

type SpoolAction = 'weigh' | 'edit' | 'delete';

function SpoolActionsMenu({
  onAction,
}: {
  onAction: (action: SpoolAction) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
        Actions
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => onAction('weigh')}>
          <ScaleIcon />
          Re-weigh
          <DropdownMenuShortcut>W</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAction('edit')}>
          <PencilIcon />
          Edit
          <DropdownMenuShortcut>E</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem disabled>Lend (already lent)</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => onAction('delete')}
        >
          <Trash2Icon />
          Delete spool
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Per-spool row actions, incl. a disabled and a destructive item. */
export const SpoolActions: StoryObj<typeof SpoolActionsMenu> = {
  args: { onAction: fn() },
  render: (args) => <SpoolActionsMenu {...args} />,
};

/** The header user menu: labelled groups, a theme radio group, sign-out. */
export const UserMenu: Story = {
  render: (args) => (
    <DropdownMenu {...args}>
      <DropdownMenuTrigger
        render={<Button variant="ghost" aria-label="Account menu" />}
      >
        <CircleUserIcon />
        Connor
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Connor</DropdownMenuLabel>
          <DropdownMenuItem>
            <SettingsIcon />
            Account
          </DropdownMenuItem>
          <DropdownMenuItem>
            <BarChart3Icon />
            Statistics
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup defaultValue="system">
          <DropdownMenuLabel>Theme</DropdownMenuLabel>
          <DropdownMenuRadioItem value="light">
            <SunIcon />
            Light
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <MoonIcon />
            Dark
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <MonitorIcon />
            System
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <LogOutIcon />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};

export const Checkboxes: Story = {
  render: (args) => (
    <DropdownMenu {...args}>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
        Columns
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuGroup>
          <DropdownMenuLabel>Show</DropdownMenuLabel>
          <DropdownMenuCheckboxItem defaultChecked>
            Location
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem defaultChecked>
            Price
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem>Last dried</DropdownMenuCheckboxItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};

/** Open on load, for checking the panel in both themes. */
export const Open: Story = {
  args: { defaultOpen: true },
  render: UserMenu.render,
};
