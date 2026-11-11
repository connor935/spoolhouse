import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as stories from './review-summary.stories';

const { Pending, NewManufacturer, Imported, NoColour } =
  composeStories(stories);

describe('ReviewSummary', () => {
  it('heads with the entry and its status', () => {
    render(<Pending />);
    expect(
      screen.getByRole('heading', { level: 2, name: 'Galaxy Blue' })
    ).toBeInTheDocument();
    expect(screen.getByText('Pending review')).toBeInTheDocument();
    expect(screen.getByText('Sunlu · #23407A')).toBeInTheDocument();
  });

  it('lists the facts a reviewer decides on', () => {
    render(<Pending />);
    expect(screen.getByText('existing · 142 materials')).toBeInTheDocument();
    expect(
      screen.getByText('2 h ago · not a trusted contributor')
    ).toBeInTheDocument();
    expect(screen.getByText('1 spool (Anna Weber)')).toBeInTheDocument();
    expect(screen.getAllByText('#23407A').length).toBeGreaterThan(0);
  });

  it('flags a new manufacturer and an unused entry', () => {
    render(<NewManufacturer />);
    expect(screen.getByText('new manufacturer')).toBeInTheDocument();
    expect(
      screen.getByText('2 h ago · trusted contributor')
    ).toBeInTheDocument();
    expect(screen.getByText('Not in use')).toBeInTheDocument();
  });

  it('names imported entries instead of a submitter', () => {
    render(<Imported />);
    expect(screen.getByText('Imported')).toBeInTheDocument();
    expect(screen.getByText('4 spools')).toBeInTheDocument();
  });

  it('says when no colour is set', () => {
    render(<NoColour />);
    expect(screen.getByText('No colour set')).toBeInTheDocument();
    // Without a hex the header line is just the manufacturer.
    expect(
      screen.getByText('Sunlu', { selector: '.kicker' })
    ).toBeInTheDocument();
  });
});
