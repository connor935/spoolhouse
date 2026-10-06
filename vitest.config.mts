import path from 'node:path';
import { defineConfig } from 'vitest/config';

// Unit tests for the pure domain logic (lib/**/*.test.ts). Nothing here needs
// a database or a running server.
export default defineConfig({
  resolve: { alias: { '@': path.resolve(import.meta.dirname) } },
  test: { include: ['lib/**/*.test.ts'] },
});
