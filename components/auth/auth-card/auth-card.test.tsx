import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as stories from './auth-card.stories';

const { Default, WithoutFooter } = composeStories(stories);

describe('AuthCard', () => {
  it('renders the page heading, description, form and footer', () => {
    render(<Default />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Sign in' })
    ).toBeVisible();
    expect(screen.getByText('Spoolhouse')).toBeVisible();
    expect(screen.getByText('Manage your filament inventory')).toBeVisible();
    expect(screen.getByText('Form fields go here.')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Sign up' })).toBeVisible();
  });

  it('leaves the footer out when there is none', () => {
    render(<WithoutFooter />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
