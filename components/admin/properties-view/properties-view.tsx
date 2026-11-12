'use client';

import * as React from 'react';
import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';

import type { PropertyDefinition } from '@/components/admin/property-dialog';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { SectionHeader } from '@/components/common/section-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  PROPERTY_VALUE_TYPE_HINTS,
  PROPERTY_VALUE_TYPES,
} from '@/lib/property-value';

type PropertiesViewProps = {
  properties: PropertyDefinition[];
  /** Id of the definition being deleted. */
  deletingId?: string | null;
  onCreate: () => void;
  onEdit: (property: PropertyDefinition) => void;
  onDelete: (property: PropertyDefinition) => void;
};

const fmt = (n: number) => n.toLocaleString('en-US');
const plural = (n: number, word: string) =>
  `${fmt(n)} ${word}${n === 1 ? '' : 's'}`;

/**
 * `/admin/properties` (AdminProperties board): the definitions table and the
 * value-type explainer. Create/edit happen in the PropertyDialog.
 */
function PropertiesView({
  properties,
  deletingId,
  onCreate,
  onEdit,
  onDelete,
}: PropertiesViewProps) {
  const typesId = React.useId();
  const values = properties.reduce((s, p) => s + p.valueCount, 0);

  return (
    <div data-slot="properties-view" className="flex flex-col gap-9">
      <PageHeader
        index="A3"
        breadcrumb={[{ label: 'Admin' }, { label: 'Properties' }]}
        meta={`${plural(properties.length, 'definition')} · ${plural(values, 'value')}`}
        title="Properties"
        description="Datasheet property definitions shown on materials (tensile strength, hardness, glass-transition temp, …). Any member can fill in a material's values; admins verify them."
        actions={
          <Button onClick={onCreate}>
            <PlusIcon aria-hidden />
            New property
          </Button>
        }
      />

      {properties.length === 0 ? (
        <EmptyState
          title="No properties yet"
          description="Define the first datasheet property — materials can then carry values for it."
        />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Name</TableHead>
                <TableHead scope="col">Key</TableHead>
                <TableHead scope="col">Unit</TableHead>
                <TableHead scope="col">Value type</TableHead>
                <TableHead scope="col">In use</TableHead>
                <TableHead scope="col" align="right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {properties.map((p) => {
                const inUse = p.valueCount > 0;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium whitespace-nowrap">
                      {p.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">
                      {p.key}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {p.unit ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge>{p.valueType}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                      <span className="text-foreground tabular font-mono">
                        {fmt(p.valueCount)}
                      </span>{' '}
                      material value{p.valueCount === 1 ? '' : 's'}
                    </TableCell>
                    <TableCell align="right" className="whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${p.name}`}
                        onClick={() => onEdit(p)}
                      >
                        <PencilIcon aria-hidden />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${p.name}`}
                        title={
                          inUse
                            ? `In use by ${plural(p.valueCount, 'material value')}`
                            : undefined
                        }
                        disabled={inUse || deletingId === p.id}
                        onClick={() => onDelete(p)}
                      >
                        <Trash2Icon aria-hidden />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <section aria-labelledby={typesId} className="max-w-2xl">
        <SectionHeader id={typesId} index="i" title="Value types" />
        <dl>
          {PROPERTY_VALUE_TYPES.map((t) => (
            <div
              key={t}
              className="border-border flex gap-4 border-t py-2.5 text-sm"
            >
              <dt className="w-20 shrink-0 font-mono text-xs leading-5">{t}</dt>
              <dd className="text-muted-foreground">
                {PROPERTY_VALUE_TYPE_HINTS[t]}
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-muted-foreground mt-3 text-xs">
          Values are checked and normalised on save, so a decimal comma
          can&apos;t be stored as a range.
        </p>
      </section>
    </div>
  );
}

export { PropertiesView };
