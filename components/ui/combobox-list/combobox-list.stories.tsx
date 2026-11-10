import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useCallback } from 'react';
import { fn } from 'storybook/test';
import { useCombobox } from '@/hooks/use-combobox';
import { Button } from '../button';
import { Input } from '../input';
import { Label } from '../label';
import {
  ComboboxEmpty,
  ComboboxFooter,
  ComboboxList,
  ComboboxOption,
  ComboboxPopup,
} from './combobox-list';

type Material = {
  id: string;
  manufacturer: string;
  name: string;
  type: string;
  pending?: boolean;
};

const materials: Material[] = [
  { id: '1', manufacturer: 'Prusament', name: 'Galaxy Black', type: 'PLA' },
  { id: '2', manufacturer: 'Prusament', name: 'Galaxy Black', type: 'PETG' },
  { id: '3', manufacturer: 'Prusament', name: 'Galaxy Purple', type: 'PLA' },
  { id: '4', manufacturer: 'Prusament', name: 'Galaxy Silver', type: 'PETG' },
  {
    id: '5',
    manufacturer: 'Sunlu',
    name: 'Galaxy Blue',
    type: 'PLA',
    pending: true,
  },
];

type Args = { onSelect: (material: Material) => void; items: Material[] };

// The material picker from SpoolAdd.dc.html, driven by the existing
// useCombobox hook — the same pairing material-picker.tsx will adopt.
function MaterialCombobox({ onSelect, items }: Args) {
  const filter = useCallback(
    (all: Material[], query: string) =>
      all.filter((m) =>
        `${m.manufacturer} ${m.name} ${m.type}`
          .toLowerCase()
          .includes(query.toLowerCase())
      ),
    []
  );
  const {
    open,
    results,
    activeIndex,
    setActiveIndex,
    select,
    inputProps,
    listboxProps,
  } = useCombobox({ items, filter, onSelect });

  return (
    <div className="flex w-[420px] flex-col gap-1.5">
      <Label htmlFor="material">Material</Label>
      <div className="relative">
        <Input
          id="material"
          placeholder="Search material or manufacturer…"
          aria-controls="material-listbox"
          {...inputProps}
        />
        {open && (
          <ComboboxPopup className="absolute inset-x-0 top-full mt-1">
            {results.length === 0 ? (
              <ComboboxEmpty>No materials match.</ComboboxEmpty>
            ) : (
              <ComboboxList
                id="material-listbox"
                aria-label="Materials"
                {...listboxProps}
              >
                {results.map((m, i) => (
                  <ComboboxOption
                    key={m.id}
                    active={i === activeIndex}
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => select(m)}
                  >
                    <span
                      aria-hidden
                      className="bg-muted ring-swatch-ring size-4 shrink-0 rounded-full ring-1"
                    />
                    <span className="min-w-0 flex-1 truncate">
                      <span className="text-muted-foreground">
                        {m.manufacturer} ·{' '}
                      </span>
                      {m.name}
                      {m.pending && <span className="kicker"> · pending</span>}
                    </span>
                    <span className="border-ink rounded-[3px] border px-1 font-mono text-[10.5px] font-semibold">
                      {m.type}
                    </span>
                  </ComboboxOption>
                ))}
              </ComboboxList>
            )}
            <ComboboxFooter>
              <Button variant="outline" size="sm" tabIndex={-1}>
                All manufacturers
              </Button>
              <Button variant="outline" size="sm" tabIndex={-1}>
                All types
              </Button>
              <span className="ml-auto">max. 50 shown</span>
            </ComboboxFooter>
          </ComboboxPopup>
        )}
      </div>
    </div>
  );
}

const meta = {
  title: 'UI/ComboboxList',
  args: { onSelect: fn(), items: materials },
  parameters: { layout: 'padded' },
  render: (args) => <MaterialCombobox {...args} />,
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MaterialPicker: Story = {};

export const Empty: Story = { args: { items: [] } };

/** Static list, as rendered under the input in SpoolAdd.dc.html. */
export const StaticList: Story = {
  render: () => (
    <ComboboxPopup className="w-[420px]">
      <ComboboxList aria-label="Materials">
        {materials.map((m, i) => (
          <ComboboxOption key={m.id} active={i === 0}>
            <span className="text-muted-foreground">{m.manufacturer} · </span>
            {m.name}
            <span className="ml-auto font-mono text-xs">{m.type}</span>
          </ComboboxOption>
        ))}
      </ComboboxList>
      <ComboboxFooter>max. 50 shown</ComboboxFooter>
    </ComboboxPopup>
  ),
};
