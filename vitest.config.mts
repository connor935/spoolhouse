import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const root = import.meta.dirname;

export default defineConfig({
  resolve: { alias: { '@': path.resolve(root) } },
  test: {
    projects: [
      // Unit tests for the pure domain logic. Nothing here needs a database
      // or a running server.
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['lib/**/*.test.ts'],
          environment: 'node',
        },
      },
      // Component tests (jsdom + Testing Library). Stories are composed into
      // tests with the same project annotations as Storybook. No Storybook
      // Next.js plugin here: its global module-alias hook breaks under Node's
      // ESM loader, and presentational components don't need Next runtime
      // mocks. Only next/font is stubbed, because lib/fonts.ts (used by the
      // preview) calls it at import time.
      {
        extends: true,
        plugins: [react()],
        resolve: {
          alias: {
            'next/font/google': path.resolve(
              root,
              '.storybook/mocks/next-font-google.ts'
            ),
          },
        },
        test: {
          name: 'components',
          include: ['components/**/*.test.tsx'],
          environment: 'jsdom',
          setupFiles: ['.storybook/vitest.setup.ts'],
          css: false,
        },
      },
    ],
  },
});
