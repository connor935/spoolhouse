'use client';

import { PlusIcon } from 'lucide-react';
import type * as React from 'react';

import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useHotkeys } from '@/hooks/use-hotkeys';

type CatalogPageProps = {
  /** Sidebar section number: "06" materials, "07" spool types. */
  index: string;
  title: string;
  /** Size of the whole catalog the viewer sees ("Global catalog · 23,871 entries"). */
  totalEntries: number;
  description: React.ReactNode;
  /** "Request material", or "Add material" for those who publish directly. */
  requestLabel: string;
  requestOpen: boolean;
  onRequestOpenChange: (open: boolean) => void;
  /** Heading of the side panel, e.g. "Request a new material". */
  requestTitle: string;
  /** The request form; rendered only while the panel is open. */
  requestForm: React.ReactNode;
  /** Phone layout: bottom sheet, full-width request button. */
  compact?: boolean;
  /** Toolbar, filters and the list. */
  children: React.ReactNode;
};

const fmt = (n: number) => n.toLocaleString('en-US');

/**
 * Frame of the two catalog pages (CatalogMaterials, CatalogSpoolTypes,
 * CatalogMobile boards): header with the request action, the page's own
 * content, and the request form in a side panel (bottom sheet on phones).
 */
function CatalogPage({
  index,
  title,
  totalEntries,
  description,
  requestLabel,
  requestOpen,
  onRequestOpenChange,
  requestTitle,
  requestForm,
  compact = false,
  children,
}: CatalogPageProps) {
  useHotkeys({ r: () => onRequestOpenChange(true) });
  const requestButton = (
    <Button
      variant="accent"
      className={compact ? 'h-11 w-full' : undefined}
      onClick={() => onRequestOpenChange(true)}
      aria-keyshortcuts="R"
    >
      <PlusIcon />
      {requestLabel}
      {!compact && <Kbd aria-hidden>R</Kbd>}
    </Button>
  );

  return (
    <div className="flex flex-col gap-5 max-sm:gap-3">
      <PageHeader
        index={index}
        kicker={title}
        meta={`Global catalog · ${fmt(totalEntries)} entries`}
        title={title}
        description={description}
        actions={compact ? undefined : requestButton}
      />
      {children}
      {compact && (
        <div className="bg-background/95 sticky bottom-0 z-10 -mx-4 border-t px-4 py-3">
          {requestButton}
        </div>
      )}
      <Sheet open={requestOpen} onOpenChange={onRequestOpenChange}>
        <SheetContent
          side={compact ? 'bottom' : 'right'}
          className={compact ? undefined : 'w-[min(540px,100vw)] sm:max-w-none'}
        >
          <SheetHeader kicker={`${index} — ${title}`}>
            <SheetTitle className="text-[30px]">{requestTitle}</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 overflow-y-auto">
            {requestOpen && requestForm}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export { CatalogPage };
