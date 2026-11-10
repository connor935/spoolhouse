import type { StorybookConfig } from '@storybook/nextjs-vite';

// Storybook for isolated component work during the redesign
// (see .claude/redesign-plan.md, Phase 2). Stories live next to their
// component as `*.stories.tsx`; Tailwind v4 is picked up through
// postcss.config.mjs, exactly like the Next build.
const config: StorybookConfig = {
  stories: ['../components/**/*.mdx', '../components/**/*.stories.@(ts|tsx)'],
  addons: [
    '@storybook/addon-docs',
    '@storybook/addon-a11y',
    '@storybook/addon-themes',
  ],
  framework: { name: '@storybook/nextjs-vite', options: {} },
  staticDirs: ['../public'],
  core: { disableTelemetry: true },
};

export default config;
