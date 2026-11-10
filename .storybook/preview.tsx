import { withThemeByClassName } from '@storybook/addon-themes';
import type { Preview } from '@storybook/nextjs-vite';
import { fontVariables } from '../lib/fonts';
import '../app/globals.css';

// Same viewports as the design boards (.claude/design/canvas.json).
const viewports = {
  mobile: {
    name: 'Mobile · 390',
    styles: { width: '390px', height: '844px' },
    type: 'mobile',
  },
  desktop: {
    name: 'Desktop · 1440',
    styles: { width: '1440px', height: '900px' },
    type: 'desktop',
  },
} as const;

const preview: Preview = {
  // Font CSS variables must sit on <html> (like app/layout.tsx) so portalled
  // content — dialogs, popovers, toasts — gets the fonts too.
  beforeAll() {
    document.documentElement.classList.add(...fontVariables.split(' '));
  },
  decorators: [
    // Toggles `.dark` on <html>, the same class strategy next-themes uses.
    withThemeByClassName({
      themes: { light: '', dark: 'dark' },
      defaultTheme: 'light',
      parentSelector: 'html',
    }),
  ],
  parameters: {
    layout: 'padded',
    nextjs: { appDirectory: true },
    controls: {
      matchers: { color: /(background|color)$/i, date: /(Date|At)$/ },
    },
    viewport: { options: viewports },
    backgrounds: { disable: true },
    // Fail the a11y panel loudly; switch individual stories to 'todo' only
    // with a comment saying why.
    a11y: { test: 'error' },
  },
};

export default preview;
