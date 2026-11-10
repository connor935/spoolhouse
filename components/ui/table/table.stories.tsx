import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './table';

const rows = [
  { name: 'Prusament', type: 'PLA', spools: 4, left: '2.8 kg' },
  { name: 'Extrudr', type: 'PETG', spools: 2, left: '1.1 kg' },
  { name: 'Sunlu', type: 'TPU', spools: 1, left: '310 g' },
];

const meta = {
  title: 'UI/Table',
  render: () => (
    <Table>
      <TableCaption>3 manufacturers</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Manufacturer</TableHead>
          <TableHead>Type</TableHead>
          <TableHead align="right">Spools</TableHead>
          <TableHead align="right">Left</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.name}>
            <TableCell className="font-medium">{row.name}</TableCell>
            <TableCell>{row.type}</TableCell>
            <TableCell align="right">{row.spools}</TableCell>
            <TableCell align="right" className="font-mono">
              {row.left}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Mobile: Story = { globals: { viewport: { value: 'mobile' } } };
