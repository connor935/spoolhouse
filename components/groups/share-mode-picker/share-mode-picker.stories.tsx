import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { SectionHeader } from '@/components/common/section-header';
import { shareableMaterials, whitelistIds } from '@/stories/fixtures/social';

import {
  ShareModePicker,
  shareModePreview,
  type ShareMode,
} from './share-mode-picker';

type Props = React.ComponentProps<typeof ShareModePicker>;

// Controlled component: the stories keep the state, like the page will.
function Stateful(args: Props) {
  const [mode, setMode] = React.useState<ShareMode>(args.mode);
  const [ids, setIds] = React.useState(args.selectedIds);
  return (
    <ShareModePicker
      {...args}
      mode={mode}
      onModeChange={(next) => {
        setMode(next);
        args.onModeChange(next);
      }}
      selectedIds={ids}
      onSelectedIdsChange={(next) => {
        setIds(next);
        args.onSelectedIdsChange(next);
      }}
    />
  );
}

const meta = {
  title: 'Design/ShareModePicker',
  component: ShareModePicker,
  args: {
    mode: 'whitelist',
    selectedIds: whitelistIds,
    materials: shareableMaterials,
    onModeChange: fn(),
    onSelectedIdsChange: fn(),
    onSave: fn(),
  },
  render: (args) => (
    <div className="max-w-[1080px]">
      <Stateful {...args} />
    </div>
  ),
} satisfies Meta<typeof ShareModePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The board: whitelist, 6 of 14 spools visible. */
export const Whitelist: Story = {};

export const ShareAll: Story = { args: { mode: 'all', selectedIds: [] } };

export const Blacklist: Story = {
  args: { mode: 'blacklist', selectedIds: ['mat-graphite'] },
};

export const Saving: Story = { args: { saving: true } };

export const NoSpools: Story = { args: { materials: [], selectedIds: [] } };

/** GroupSettings 01, with the count in the section header. */
export const MySharingSection: Story = {
  render: function Render(args) {
    const [mode, setMode] = React.useState<ShareMode>(args.mode);
    const [ids, setIds] = React.useState(args.selectedIds);
    const { visible, total } = shareModePreview(mode, ids, args.materials);
    return (
      <section className="max-w-[1080px]">
        <SectionHeader
          index="01"
          title="My sharing"
          aside={
            <span className="kicker text-foreground">
              {visible}/{total} spools visible
            </span>
          }
        />
        <ShareModePicker
          {...args}
          mode={mode}
          onModeChange={setMode}
          selectedIds={ids}
          onSelectedIdsChange={setIds}
        />
      </section>
    );
  },
};

export const Mobile: Story = {
  ...MySharingSection,
  globals: { viewport: { value: 'mobile' } },
};
