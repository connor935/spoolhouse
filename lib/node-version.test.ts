import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import pkg from '../package.json';

// .node-version (fnm/nvm) pins the exact Node; package.json "engines" (with
// engine-strict in .npmrc) enforces it on npm install/ci. Keep them in step.
describe('Node version', () => {
  const pinned = readFileSync('.node-version', 'utf8').trim().replace(/^v/, '');

  it('engines.node allows the pinned version and nothing below it', () => {
    expect(pkg.engines.node).toBe(`^${pinned}`);
  });

  it('runs on a Node that satisfies it', () => {
    const [major, minor] = process.versions.node.split('.').map(Number);
    const [pMajor, pMinor] = pinned.split('.').map(Number);
    expect(major).toBe(pMajor);
    expect(minor).toBeGreaterThanOrEqual(pMinor);
  });
});
