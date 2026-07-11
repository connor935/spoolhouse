'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, X } from 'lucide-react';
import { requestMaterial } from '@/app/actions/materials';
import { FILAMENT_TYPES, materialLabel } from '@/lib/filament';
import type { Material } from '@/lib/db/schema';
import { toast } from 'sonner';

type Props = {
  materials: Material[];
  value: Material | null;
  onChange: (material: Material | null) => void;
  // Admins skip the review queue — flips the request copy to "add".
  isAdmin?: boolean;
};

// Material picker with an inline "request new material" mini-form. Owns the
// materials it requested this session (immediately usable by the requester)
// and merges them into the select.
export function MaterialField({
  materials,
  value,
  onChange,
  isAdmin = false,
}: Props) {
  const [extras, setExtras] = useState<Material[]>([]);
  const [requesting, setRequesting] = useState(false);
  const [manufacturer, setManufacturer] = useState('');
  const [name, setName] = useState('');
  const [filamentType, setFilamentType] = useState('PLA');
  const [color, setColor] = useState('#1c7ed6');
  const [pending, setPending] = useState(false);

  const all = useMemo(() => {
    const seen = new Set(materials.map((m) => m.id));
    return [...materials, ...extras.filter((m) => !seen.has(m.id))];
  }, [materials, extras]);

  // Base UI Select renders raw values unless the root gets an items map
  const items = useMemo(
    () =>
      all.map((m) => ({
        value: String(m.id),
        label: `${materialLabel(m)}${m.status === 'pending' ? ' — pending' : ''}`,
      })),
    [all]
  );

  async function handleRequest() {
    if (!manufacturer.trim() || !name.trim()) {
      toast.error('Manufacturer and name are required');
      return;
    }
    try {
      setPending(true);
      const created = await requestMaterial({
        manufacturer: manufacturer.trim(),
        name: name.trim(),
        filamentType,
        color,
      });
      setExtras((prev) => [...prev, created]);
      onChange(created);
      setRequesting(false);
      setManufacturer('');
      setName('');
      toast.success(
        created.status === 'approved'
          ? 'Material added to the catalog'
          : 'Material requested — you can use it right away'
      );
    } catch {
      toast.error('Could not request material');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="material">Material</Label>
        {!requesting && (
          <button
            type="button"
            onClick={() => setRequesting(true)}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
          >
            <Plus className="h-3 w-3" />
            {isAdmin ? 'Add new' : 'Request new'}
          </button>
        )}
      </div>
      <Select
        items={items}
        value={value ? String(value.id) : null}
        onValueChange={(v) =>
          v && onChange(all.find((m) => String(m.id) === v) ?? null)
        }
      >
        <SelectTrigger id="material" className="w-full">
          <SelectValue placeholder="Pick a material" />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {requesting && (
        <div className="border-border bg-secondary/50 flex flex-col gap-3 rounded-md border p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {isAdmin ? 'Add new material' : 'Request new material'}
            </span>
            <button
              type="button"
              onClick={() => setRequesting(false)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Close material request form"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reqMManufacturer" className="text-xs">
                Manufacturer
              </Label>
              <Input
                id="reqMManufacturer"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="e.g. Prusament"
                className="h-8"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reqMName" className="text-xs">
                Material name
              </Label>
              <Input
                id="reqMName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Galaxy Black"
                className="h-8"
              />
            </div>
          </div>
          <div className="flex items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reqMType" className="text-xs">
                Type
              </Label>
              <Select
                value={filamentType}
                onValueChange={(v) => v && setFilamentType(v)}
              >
                <SelectTrigger id="reqMType" className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FILAMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reqMColor" className="text-xs">
                Color
              </Label>
              <input
                id="reqMColor"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="border-input h-8 w-12 cursor-pointer rounded-md border bg-transparent p-1"
                aria-label="Material color"
              />
            </div>
            <Button
              type="button"
              size="sm"
              onClick={handleRequest}
              disabled={pending}
            >
              {pending
                ? isAdmin
                  ? 'Adding…'
                  : 'Requesting…'
                : isAdmin
                  ? 'Add'
                  : 'Request'}
            </Button>
          </div>
          <p className="text-muted-foreground text-xs">
            {isAdmin
              ? 'As an admin, this is added to the global catalog straight away.'
              : 'You can use it immediately; an admin will review it for the global catalog.'}
          </p>
        </div>
      )}
    </div>
  );
}
