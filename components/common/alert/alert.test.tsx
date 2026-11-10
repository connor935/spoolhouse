import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';
import { Button } from '@/components/ui/button';
import * as stories from './alert.stories';

const { Default, WithAction, WithoutIcon, NoteBox } = composeStories(stories);

describe('Alert', () => {
  it('is announced as an alert, with a default icon', () => {
    render(<Default />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('SpoolmanDB returned 502 Bad Gateway.');
    expect(alert.querySelector('svg')).not.toBeNull();
  });

  it('renders the action', async () => {
    const onClick = fn();
    render(<WithAction action={<Button onClick={onClick}>Retry</Button>} />);
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('drops the icon with icon={null}', () => {
    render(<WithoutIcon />);
    expect(screen.getByRole('alert').querySelector('svg')).toBeNull();
  });
});

describe('Note', () => {
  it('is a polite status message', () => {
    render(<NoteBox />);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Imported 3 manufacturers'
    );
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
