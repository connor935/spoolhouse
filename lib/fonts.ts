import { Barlow_Condensed, Geist, Geist_Mono } from 'next/font/google';

// Single source of the app fonts, shared by app/layout.tsx and the Storybook
// preview so both expose the same CSS variables to the Tailwind theme
// (--font-sans / --font-mono / --font-display in app/globals.css).
const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});
// Display face: page titles, section heads, material names, big numbers.
const barlowCondensed = Barlow_Condensed({
  variable: '--font-barlow-condensed',
  subsets: ['latin'],
  weight: '600',
});

/** Class names that define the font CSS variables; put them on <html>. */
export const fontVariables = [
  geistSans.variable,
  geistMono.variable,
  barlowCondensed.variable,
].join(' ');
