import { act, render, screen } from '@testing-library/react';
import { useTheme } from 'next-themes';
import { afterEach, describe, expect, it } from 'vitest';
import { ThemeProvider } from './theme-provider';

function Probe() {
  const { theme, setTheme } = useTheme();
  return (
    <button type="button" onClick={() => setTheme('dark')}>
      theme:{theme}
    </button>
  );
}

afterEach(() => {
  document.documentElement.className = '';
  localStorage.clear();
});

describe('ThemeProvider', () => {
  it('defaults to the system theme', () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );
    expect(screen.getByRole('button')).toHaveTextContent('theme:system');
  });

  it('switches themes via the .dark class on <html>', () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );
    act(() => screen.getByRole('button').click());
    expect(document.documentElement).toHaveClass('dark');
  });
});
