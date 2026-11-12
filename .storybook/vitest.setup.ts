import '@testing-library/jest-dom/vitest';
import { setProjectAnnotations } from '@storybook/react';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import * as preview from './preview';

// Component tests reuse stories as fixtures (`composeStories`), so they get the
// same decorators/parameters as Storybook itself.
setProjectAnnotations([preview]);

// jsdom has no matchMedia. Default to "no query matches" (desktop, light,
// motion allowed); a test that needs mobile spies on window.matchMedia.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

afterEach(() => {
  cleanup();
});
