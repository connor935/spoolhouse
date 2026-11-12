import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Guards the Prusa Orange & Graphite palette (design/PALETTE-PRUSA.md):
// both modes define the text-safe accent and the data color, and no value of
// the retired petrol palette survives in the token sheet.
const css = readFileSync(path.join(process.cwd(), 'app/globals.css'), 'utf8');

function block(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  expect(start, `${selector} block`).toBeGreaterThanOrEqual(0);
  return css.slice(start, css.indexOf('}', start));
}

describe('theme tokens', () => {
  it.each([':root', '.dark'])('%s defines --accent-ink and --data', (sel) => {
    const b = block(sel);
    expect(b).toMatch(/--accent-ink:\s*oklch\(/);
    expect(b).toMatch(/--data:\s*oklch\(/);
  });

  it('registers the new tokens as Tailwind colors', () => {
    expect(css).toContain('--color-accent-ink: var(--accent-ink);');
    expect(css).toContain('--color-data: var(--data);');
  });

  it('uses Prusa orange as accent and graphite as light primary', () => {
    expect(block(':root')).toContain('--accent: oklch(0.693 0.191 39.3);');
    expect(block(':root')).toContain('--primary: oklch(0.218 0 0);');
    // Dark text on orange, never white.
    expect(block(':root')).toContain('--accent-foreground: oklch(0.218 0 0);');
  });

  it('has no leftovers of the petrol palette', () => {
    for (const old of [
      '0.52 0.09 210',
      '0.6 0.1 205',
      '0.28 0.05 230',
      '0.02 235',
      '0.02 225',
    ]) {
      expect(css).not.toContain(old);
    }
  });
});
