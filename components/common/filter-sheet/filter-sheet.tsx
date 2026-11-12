'use client';

import {
  FilterFields,
  type FilterFieldsProps,
} from '@/components/common/filter-fields';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { countActiveFilters, EMPTY_FILTER_VALUE } from '@/lib/filter-value';

type FilterSheetProps = FilterFieldsProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Results with the current value, for "Show 6 spools". */
  resultCount: number;
  /** Singular and plural noun for the results. */
  resultNoun?: readonly [string, string];
};

/**
 * Mobile filters (FiltersMobile board): the same fields as FilterPanel in a
 * bottom sheet. Edits apply live; the button just closes the sheet.
 */
function FilterSheet({
  open,
  onOpenChange,
  resultCount,
  resultNoun = ['spool', 'spools'],
  ...fields
}: FilterSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="gap-[18px]"
      >
        <SheetHeader className="flex-row items-center justify-between pr-0">
          <SheetTitle className="text-[28px]">Filters</SheetTitle>
          <Button
            variant="ghost"
            size="sm"
            disabled={countActiveFilters(fields.value) === 0}
            onClick={() => fields.onChange(EMPTY_FILTER_VALUE)}
          >
            Clear all
          </Button>
        </SheetHeader>
        <FilterFields layout="sheet" {...fields} />
        <Button
          size="lg"
          className="w-full"
          onClick={() => onOpenChange(false)}
        >
          Show {resultCount.toLocaleString('en-US')}{' '}
          {resultCount === 1 ? resultNoun[0] : resultNoun[1]}
        </Button>
      </SheetContent>
    </Sheet>
  );
}

export { FilterSheet };
