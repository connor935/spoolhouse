import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';
import * as stories from './switch.stories';

const { Off, On, Disabled, WithLabel } = composeStories(stories);

describe('Switch', () => {
  it('toggles and reports the new state', async () => {
    const onCheckedChange = fn();
    render(<Off onCheckedChange={onCheckedChange} />);
    const toggle = screen.getByRole('switch', {
      name: 'Trusted contributor: Anna Weber',
    });
    expect(toggle).not.toBeChecked();
    await userEvent.click(toggle);
    expect(toggle).toBeChecked();
    expect(onCheckedChange).toHaveBeenLastCalledWith(true, expect.anything());
  });

  it('starts on', () => {
    render(<On />);
    expect(screen.getByRole('switch')).toBeChecked();
  });

  it('is named and toggled by its wrapping label', async () => {
    render(<WithLabel />);
    await userEvent.click(screen.getByText('Trusted contributor'));
    expect(
      screen.getByRole('switch', { name: 'Trusted contributor' })
    ).toBeChecked();
  });

  it('ignores clicks while disabled', async () => {
    const onCheckedChange = fn();
    render(<Disabled onCheckedChange={onCheckedChange} />);
    await userEvent.click(screen.getByRole('switch'));
    expect(onCheckedChange).not.toHaveBeenCalled();
    expect(screen.getByRole('switch')).toBeChecked();
  });
});
