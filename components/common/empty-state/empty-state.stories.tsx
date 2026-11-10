import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import {
  BellIcon,
  ChartColumnIcon,
  FilterXIcon,
  LayersIcon,
  UsersIcon,
} from 'lucide-react';
import { fn } from 'storybook/test';

import { Button } from '@/components/ui/button';
import { EmptyState } from './empty-state';

const meta = {
  title: 'Design/EmptyState',
  component: EmptyState,
  args: {
    kicker: 'Inventory',
    icon: <FilterXIcon />,
    title: 'No spools match these filters.',
    action: (
      <Button variant="outline" size="sm" onClick={fn()}>
        Clear filters
      </Button>
    ),
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Patterns 04: "Your shelf is empty" with three numbered steps. */
export const Onboarding: Story = {
  args: {
    kicker: 'Overview · new user',
    icon: <LayersIcon />,
    title: 'Your shelf is empty',
    description:
      "Add a spool, weigh it now and then, and Spoolhouse tracks what's left, what you use and what it costs.",
    steps: [
      'Pick a material from the catalog',
      'Weigh the full spool',
      'Re-weigh after printing',
    ],
    action: (
      <Button variant="accent" size="lg" onClick={fn()}>
        Add your first spool
      </Button>
    ),
  },
};

export const WithDescription: Story = {
  args: {
    kicker: 'Groups',
    icon: <UsersIcon />,
    title: "You're not in a group yet.",
    description:
      'Invite-only groups for sharing and lending spools with people nearby.',
    action: (
      <>
        <Button size="sm">Create a group</Button>
        <Button variant="outline" size="sm">
          Join with code
        </Button>
      </>
    ),
  },
};

/** The full set from the Patterns board. */
export const Gallery: Story = {
  render: () => (
    <div className="grid gap-4 sm:grid-cols-3">
      <EmptyState
        {...Onboarding.args}
        className="row-span-2"
        title="Your shelf is empty"
      />
      <EmptyState {...meta.args} />
      <EmptyState
        kicker="Statistics"
        icon={<ChartColumnIcon />}
        title="No usage yet. Re-weigh your spools now and then and this page fills up…"
      />
      <EmptyState
        {...WithDescription.args}
        title="You're not in a group yet."
      />
      <EmptyState
        kicker="Notifications"
        icon={<BellIcon />}
        title="All quiet. Borrow requests and replies show up here."
      />
    </div>
  ),
};

export const Mobile: Story = {
  ...Onboarding,
  globals: { viewport: { value: 'mobile', isRotated: false } },
};
