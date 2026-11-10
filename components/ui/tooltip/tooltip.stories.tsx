import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { BellIcon, BoxIcon, ChartColumnIcon, LayersIcon } from 'lucide-react';
import { Button } from '../button';
import { Kbd } from '../kbd';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './tooltip';

const meta = {
  title: 'UI/Tooltip',
  component: TooltipContent,
  args: { side: 'top', children: 'Notifications' },
  argTypes: {
    side: { control: 'select', options: ['top', 'right', 'bottom', 'left'] },
  },
  decorators: [
    (Story) => (
      <TooltipProvider>
        <div className="flex min-h-40 items-center justify-center">
          <Story />
        </div>
      </TooltipProvider>
    ),
  ],
} satisfies Meta<typeof TooltipContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="Notifications" />
        }
      >
        <BellIcon />
      </TooltipTrigger>
      <TooltipContent {...args} />
    </Tooltip>
  ),
};

export const WithShortcut: Story = {
  args: {
    children: (
      <>
        Add spool <Kbd>N</Kbd>
      </>
    ),
  },
  render: Default.render,
};

/** Collapsed sidebar rail: icon-only links, label in a tooltip to the right. */
export const CollapsedRail: Story = {
  args: { side: 'right' },
  render: (args) => (
    <nav
      aria-label="Main"
      className="border-ink flex flex-col gap-1 border-r pr-2"
    >
      {(
        [
          ['Inventory', BoxIcon],
          ['Catalog', LayersIcon],
          ['Statistics', ChartColumnIcon],
        ] as const
      ).map(([label, Icon]) => (
        <Tooltip key={label}>
          <TooltipTrigger
            render={<Button variant="ghost" size="icon" aria-label={label} />}
          >
            <Icon />
          </TooltipTrigger>
          <TooltipContent {...args}>{label}</TooltipContent>
        </Tooltip>
      ))}
    </nav>
  ),
};

/** Always open, for checking the look in both themes. */
export const Open: Story = {
  render: (args) => (
    <Tooltip open>
      <TooltipTrigger render={<Button variant="outline" size="sm" />}>
        Weigh
      </TooltipTrigger>
      <TooltipContent {...args}>Dry at 65 °C</TooltipContent>
    </Tooltip>
  ),
};
