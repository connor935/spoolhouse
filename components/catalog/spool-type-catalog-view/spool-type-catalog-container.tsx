'use client';

import { useRouter } from 'next/navigation';
import * as React from 'react';
import { toast } from 'sonner';

import { requestSpoolType } from '@/app/actions/spool-types';
import { EditSpoolTypeDialog } from '@/components/catalog/edit-spool-type-dialog';
import { SpoolTypeEntryForm } from '@/components/catalog/spool-type-entry-form';
import { useIsMobile } from '@/hooks/use-is-mobile';
import type { SpoolType } from '@/lib/db/schema';
import { requestEntityToast } from '@/lib/request-entity-toast';

import {
  SpoolTypeCatalogView,
  type SpoolTypeCatalogRowData,
} from './spool-type-catalog-view';

// Wires /spool-types: local search over the full list, the request panel
// (requestSpoolType) and the edit dialog for the viewer's own entries.
function SpoolTypeCatalogContainer({
  spoolTypes,
  viewerId,
  autoApprove,
}: {
  spoolTypes: SpoolTypeCatalogRowData[];
  viewerId: string;
  autoApprove: boolean;
}) {
  const router = useRouter();
  const compact = useIsMobile();
  const [query, setQuery] = React.useState('');
  const [requestOpen, setRequestOpen] = React.useState(false);
  const [requesting, setRequesting] = React.useState(false);
  const [editing, setEditing] = React.useState<SpoolType | null>(null);

  return (
    <>
      <SpoolTypeCatalogView
        spoolTypes={spoolTypes}
        viewerId={viewerId}
        query={query}
        onQueryChange={setQuery}
        onEdit={setEditing}
        autoApprove={autoApprove}
        requestOpen={requestOpen}
        onRequestOpenChange={setRequestOpen}
        compact={compact}
        requestForm={
          <SpoolTypeEntryForm
            mode="request"
            autoApprove={autoApprove}
            pending={requesting}
            onCancel={() => setRequestOpen(false)}
            onSubmit={async (values) => {
              setRequesting(true);
              try {
                const created = await requestSpoolType(values);
                requestEntityToast('Spool type', created);
                setRequestOpen(false);
                router.refresh();
              } catch {
                toast.error(
                  'Could not request the spool type — check the fields and try again'
                );
              } finally {
                setRequesting(false);
              }
            }}
          />
        }
      />
      {editing && (
        <EditSpoolTypeDialog
          key={editing.id}
          spoolType={editing}
          open
          onOpenChange={(open) => !open && setEditing(null)}
        />
      )}
    </>
  );
}

export { SpoolTypeCatalogContainer };
