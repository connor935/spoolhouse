import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { AvatarStack, type AvatarPerson } from './avatar-stack';

const names = [
  'Felix Kratz',
  'Lena Schulz',
  'Paul Neumann',
  'Kai Hoffmann',
  'Anna Weber',
  'Jonas Brandt',
  'Mia Krüger',
  'Tom Richter',
  'Sara Vogel',
  'Ben Wolf',
  'Ida Lange',
  'Max Berger',
];

const people: AvatarPerson[] = names.map((name, i) => ({
  id: `u${i}`,
  name,
  you: i === 0,
}));

const meta = {
  title: 'Design/AvatarStack',
  component: AvatarStack,
  args: { people: people.slice(0, 5) },
} satisfies Meta<typeof AvatarStack>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Five members fit: "FK LS PN KH AW". */
export const Default: Story = {};

/** Twelve members: four shown, then "+8" (Groups board). */
export const Overflow: Story = { args: { people } };

export const Single: Story = { args: { people: people.slice(0, 1) } };
