import '@testing-library/jest-dom/vitest';
import { setProjectAnnotations } from '@storybook/react';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import * as preview from './preview';

// Component tests reuse stories as fixtures (`composeStories`), so they get the
// same decorators/parameters as Storybook itself.
setProjectAnnotations([preview]);

afterEach(() => {
  cleanup();
});
