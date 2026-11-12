import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { AuthCard } from './auth-card';

const meta = {
  title: 'Design/AuthCard',
  component: AuthCard,
  parameters: { layout: 'centered' },
  args: {
    title: 'Sign in',
    description: 'Manage your filament inventory',
    footer: (
      <>
        No account? <a href="#">Sign up</a>
      </>
    ),
    children: <p className="text-sm">Form fields go here.</p>,
  },
} satisfies Meta<typeof AuthCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithoutFooter: Story = { args: { footer: undefined } };
