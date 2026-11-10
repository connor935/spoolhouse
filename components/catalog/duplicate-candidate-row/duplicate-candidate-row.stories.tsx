import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { duplicateCandidates } from '@/stories/fixtures/catalog';
import { DuplicateCandidateRow } from './duplicate-candidate-row';

const [sameName, closeColor, similar] = duplicateCandidates;

const meta = {
  title: 'Design/DuplicateCandidateRow',
  component: DuplicateCandidateRow,
  args: sameName,
  decorators: [
    (Story) => (
      <div className="max-w-[420px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DuplicateCandidateRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SameName: Story = {};

// Story args merge over the meta's, so clear the spool count explicitly.
export const CloseColor: Story = {
  args: { spoolCount: undefined, ...closeColor },
};

export const Similar: Story = { args: { spoolCount: undefined, ...similar } };

export const AsLink: Story = { args: { href: '#materials/dup-galaxy-blue-petg' } };

/** ReviewQueue board: the "Possible duplicates" list. */
export const List: Story = {
  render: () => (
    <div>
      {duplicateCandidates.map((c) => (
        <DuplicateCandidateRow key={c.material.id} {...c} />
      ))}
      <p className="text-muted-foreground mt-2.5 text-xs leading-snug">
        If it&apos;s a duplicate, reject it — the submitter can still use their
        own entry.
      </p>
    </div>
  ),
};
