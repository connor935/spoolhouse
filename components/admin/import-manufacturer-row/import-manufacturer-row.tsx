import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

/** The fields of UpstreamManufacturer (app/actions/spoolmandb.ts) a row shows. */
export type ImportManufacturer = {
  slug: string;
  /** Display name, known once a run has imported it. */
  manufacturerName: string | null;
  importedCount: number;
  /** Message of the last failed run; null once a run succeeds. */
  lastError: string | null;
};

export type ImportStatus = 'imported' | 'never' | 'failed';

/** A failed last run wins over earlier imports: it's what needs attention. */
export function importStatus(m: ImportManufacturer): ImportStatus {
  if (m.lastError) return 'failed';
  return m.importedCount > 0 ? 'imported' : 'never';
}

const rowClass =
  'border-border flex cursor-pointer items-center gap-3 border-t py-3 has-data-disabled:cursor-not-allowed';

type ImportManufacturerRowProps = {
  manufacturer: ImportManufacturer;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** While an import runs, the selection is locked. */
  disabled?: boolean;
  className?: string;
};

/** One selectable manufacturer on the AdminImport board (`.rowline`). */
function ImportManufacturerRow({
  manufacturer,
  checked,
  onCheckedChange,
  disabled,
  className,
}: ImportManufacturerRowProps) {
  const status = importStatus(manufacturer);
  const { slug, manufacturerName, importedCount, lastError } = manufacturer;
  return (
    <label
      data-slot="import-manufacturer-row"
      data-status={status}
      className={cn(rowClass, className)}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={(next) => onCheckedChange(next)}
        disabled={disabled}
      />
      <span className="min-w-0 flex-1 truncate">
        {manufacturerName ?? slug}
        {manufacturerName && (
          <span className="text-muted-foreground font-mono text-xs">
            {' '}
            · {slug}
          </span>
        )}
      </span>
      <span
        className={cn(
          'kicker',
          status === 'imported' && 'text-foreground',
          status === 'failed' && 'text-destructive'
        )}
        title={lastError ?? undefined}
      >
        {status === 'imported'
          ? `${importedCount.toLocaleString('en-US')} imported`
          : status === 'failed'
            ? 'last run failed'
            : 'never imported'}
      </span>
    </label>
  );
}

type ImportSelectAllRowProps = {
  /** All visible rows selected. */
  checked: boolean;
  /** Some, not all, visible rows selected. */
  indeterminate?: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
};

/** Header line of the manufacturer list: select all visible + "Status". */
function ImportSelectAllRow({
  checked,
  indeterminate = false,
  onCheckedChange,
  disabled,
  className,
}: ImportSelectAllRowProps) {
  return (
    <label
      data-slot="import-select-all-row"
      className={cn(rowClass, 'border-t-0', className)}
    >
      <Checkbox
        checked={checked}
        indeterminate={indeterminate}
        onCheckedChange={(next) => onCheckedChange(next)}
        disabled={disabled}
      />
      <span className="kicker flex-1">Select all visible</span>
      <span aria-hidden className="kicker">
        Status
      </span>
    </label>
  );
}

export { ImportManufacturerRow, ImportSelectAllRow };
