import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';

import { shareableMaterials, whitelistIds } from '@/stories/fixtures/social';

import { shareModePreview } from './share-mode-picker';
import * as stories from './share-mode-picker.stories';

const { Whitelist, ShareAll, Blacklist, Saving, NoSpools, MySharingSection } =
  composeStories(stories);

const preview = () => screen.getByText(/^Preview ·/);

describe('ShareModePicker', () => {
  it('shows the selected mode and the live preview', () => {
    render(<Whitelist />);
    expect(
      screen.getByRole('radio', { name: 'Share only selected materials' })
    ).toBeChecked();
    expect(preview()).toHaveTextContent('Preview · 6 of 14 spools visible');
    expect(
      screen.getByRole('meter', { name: 'Spools visible to the group' })
    ).toHaveAttribute('aria-valuetext', '6 of 14 spools');
    expect(screen.getByText('Materials to share')).toBeInTheDocument();
  });

  it('updates the preview when a material is ticked', async () => {
    const onSelectedIdsChange = fn();
    render(<Whitelist onSelectedIdsChange={onSelectedIdsChange} />);
    await userEvent.click(
      screen.getByRole('checkbox', { name: /Prusa Orange/ })
    );
    expect(onSelectedIdsChange).toHaveBeenCalledWith([
      ...whitelistIds,
      'mat-prusa-orange',
    ]);
    expect(preview()).toHaveTextContent('8 of 14');
    await userEvent.click(
      screen.getByRole('checkbox', { name: /Galaxy Black/ })
    );
    expect(preview()).toHaveTextContent('5 of 14');
  });

  it('flips the meaning of the list with the mode', async () => {
    const onModeChange = fn();
    render(<Whitelist onModeChange={onModeChange} />);
    await userEvent.click(
      screen.getByRole('radio', { name: 'Share all except selected materials' })
    );
    expect(onModeChange).toHaveBeenCalledWith('blacklist');
    // Same three ticked materials (6 spools) are now the ones hidden.
    expect(preview()).toHaveTextContent('8 of 14');
    expect(screen.getByText('Materials to hide')).toBeInTheDocument();
  });

  it('shares everything and locks the list in "all" mode', () => {
    render(<ShareAll />);
    expect(preview()).toHaveTextContent('14 of 14');
    for (const box of screen.getAllByRole('checkbox')) {
      expect(box).toBeChecked();
      expect(box).toHaveAttribute('aria-disabled', 'true');
    }
  });

  it('counts a blacklist as everything but the selection', () => {
    render(<Blacklist />);
    expect(preview()).toHaveTextContent('13 of 14');
  });

  it('filters the checklist by search', async () => {
    render(<Whitelist />);
    await userEvent.type(
      screen.getByRole('searchbox', { name: 'Search your materials' }),
      'petg'
    );
    expect(screen.getAllByRole('checkbox')).toHaveLength(1);
    expect(
      screen.getByRole('checkbox', { name: /Prusa Orange/ })
    ).toBeInTheDocument();
  });

  it('saves, and shows when saving', async () => {
    const onSave = fn();
    const { unmount } = render(<Whitelist onSave={onSave} />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Save sharing settings' })
    );
    expect(onSave).toHaveBeenCalledOnce();
    unmount();
    render(<Saving />);
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
  });

  it('handles having no spools', () => {
    render(<NoSpools />);
    expect(preview()).toHaveTextContent('0 of 0');
    expect(
      screen.getByText("You don't have any spools yet.")
    ).toBeInTheDocument();
  });

  it('composes GroupSettings 01 with the count in the header', async () => {
    render(<MySharingSection />);
    expect(screen.getByText('6/14 spools visible')).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('radio', { name: 'Share all materials' })
    );
    expect(screen.getByText('14/14 spools visible')).toBeInTheDocument();
  });
});

describe('shareModePreview', () => {
  it('applies the same rule as the group stock', () => {
    expect(shareModePreview('all', [], shareableMaterials)).toEqual({
      visible: 14,
      total: 14,
    });
    expect(
      shareModePreview('whitelist', whitelistIds, shareableMaterials)
    ).toEqual({ visible: 6, total: 14 });
    expect(
      shareModePreview('blacklist', whitelistIds, shareableMaterials)
    ).toEqual({ visible: 8, total: 14 });
    expect(shareModePreview('whitelist', [], [])).toEqual({
      visible: 0,
      total: 0,
    });
  });
});
