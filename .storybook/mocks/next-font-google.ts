// Test-only stand-in for `next/font/google` (aliased in vitest.config.mts).
// next/font is a build-time loader that only works under the Next/Storybook
// compilers; in jsdom tests a font just needs the shape lib/fonts.ts reads.
type FontOptions = { variable?: string };

function font({ variable = '' }: FontOptions = {}) {
  return {
    className: '',
    variable: variable.replace(/^--/, 'font-var-'),
    style: { fontFamily: 'sans-serif' },
  };
}

export const Geist = font;
export const Geist_Mono = font;
export const Barlow_Condensed = font;
